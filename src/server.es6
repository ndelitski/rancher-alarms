import RancherClient from './rancher';
import resolveConfig from './config';
import ServiceHealthMonitor from './monitor';
import {isArray, some, keys, pluck, find, invoke, pairs, extend, merge, values} from 'lodash';
import {info, trace, error} from './log';
import Promise, {all} from 'bluebird';
import assert from 'assert';

(async () => {
  const config = await resolveConfig();
  assert(config.pollServicesInterval, '`pollServicesInterval` is missing');
  if (config.filter) {
    assert(isArray(config.filter), '`filters` should be of type Array');
  }
  const rancher = new RancherClient(config.rancher);
  const stacksById = (await rancher.getStacks()).reduce((map, {name, id}) => {
    map[id] = name;
    return map;
  }, {});
  const services = (await rancher.getServices())
    .filter(globalServiceFilterPredicate)
    .filter(runningServicePredicate);

  const monitors = await all(services.map(initServiceMonitor));

  info('monitors inited:');
  for (let m of monitors) {
    info(m.toString());
  }

  invoke(values(monitors), 'start');

  while(true) {
    await Promise.delay(config.pollServicesInterval);
    await updateMonitors();
  }

  async function initServiceMonitor(service) {
    const {name, environmentId} = service;
    const serviceFullName =  stacksById[environmentId].toLowerCase() + '/' + name.toLowerCase();

    const targets = extend({}, config.notifications['*'] && config.notifications['*'].targets, config.notifications[serviceFullName] && config.notifications[serviceFullName].targets);

    for(let [targetName, targetConfig] of pairs(targets)) {
      if (config.targets[targetName]) {
        merge(targetConfig, config.targets[targetName]);
      }
    }

    const healthcheck = merge({}, config.notifications['*'] && config.notifications['*'].healthcheck, config.notifications[serviceFullName] && config.notifications[serviceFullName].healthcheck);
    return new ServiceHealthMonitor({
      stackName: stacksById[environmentId],
      rancherClient: rancher,
      service,
      healthcheck,
      targets
    });
  }

  async function updateMonitors() {
    const availableServices = (await rancher.getServices()).filter(globalServiceFilterPredicate);
    const monitoredServices = pluck(monitors, 'service');
    trace(`updating monitors`);

    //check if there are new services running
    for (let s of availableServices.filter(runningServicePredicate)) {
      if (!find(monitoredServices, {id: s.id})) {
        const stackName = stacksById[s.environmentId];
        info(`discovered new running service, creating monitor for: ${stackName}/${s.name}`);
        const monitor = await initServiceMonitor(s);
        info(`new monitor up ${monitor}`);
        monitors.push(monitor);
        monitor.start();
      }
    }

    //check if there are monitors polling stopped service
    for (let s of availableServices.filter((s) => (!runningServicePredicate(s)))) {
      let monitoredService, monitor;

      if (monitoredService = find(monitoredServices, {id: s.id})) {
        monitor = find(monitors, {service: monitoredService});
        info(`stopping ${monitoredService.name} due to ${s.state} state`);
        monitors.splice(monitors.indexOf(monitor), 1);
        monitor.stop();
      }
    }
  }

  /**
   * Should we monitor this service?
   * @param service
     */
  function runningServicePredicate(service) {
    return ['active', 'upgraded', 'upgrading', 'updating-active'].indexOf(service.state) !== -1;
  }

  function globalServiceFilterPredicate(service) {
    const fullName = stacksById[service.environmentId] + '/' + service.name;

    if (config.filter) {
      const matched = some(config.filter, (f) => fullName.match(new RegExp(f)));

      if (matched) {
        return true;
      } else {
        trace(`${fullName} ignored due to global filter setup('filter' config option)`)
      }
    } else {
      return true;
    }
  }

})();

process.on('unhandledRejection', handleError);

function handleError(err) {
  error(err);
  process.exit(1);
}
