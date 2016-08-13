import _, {pairs, defaults, padRight, invoke} from 'lodash';
import Target from './notifications/target';
import {info, trace, error} from './log';
import assert from 'assert';
import {delay} from 'bluebird';
import y from 'yield';
import fs from 'fs';
import path from 'path';

class StateRingBuffer {
  get length() {
    return this._arr.length;
  }
  constructor(length) {
    this._arr = Array.apply( null, { length: length } );
  }
  push(state) {
    this._arr.shift();
    this._arr.push(state);
  }
  validateState(state) {
    for(let s of this._arr) {
      if (typeof s === 'undefined' || s !== state) {
        return false;
      }
    }
    return true;
  }
  join(sym) {
    return this._arr.join(sym)
  }
  toString() {
    let str = '[';
    const delimeter = ' ';
    for (var i = 0, len = this._arr.length; i < len; i++) {
      str += (this._arr[i] || '?') + (i !== this._arr.length - 1 ? delimeter : '')
    }
    str += ']';
    return str;
  }
}

export default class ServiceStateMonitor {

  get name() {
    return this.stackName.toLowerCase() + '/' + this.service.name.toLowerCase();
  }

  constructor({targets, templates, service, stackName, rancherClient, healthcheck}) {
    assert(service, '`service` is missing');
    assert(service.name, '`service.name` is missing');
    assert(stackName, '`stackName` is missing');
    assert(rancherClient, '`rancherClient` is missing');

    this.healthcheck = defaults(healthcheck || {}, {
      pollInterval: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3
    });

    this.service = service;
    this.state = service.state;
    this.stackName = stackName;
    this._isHealthy = true;
    this._rancher = rancherClient;
    this._unhealtyStatesBuffer = new StateRingBuffer(this.healthcheck.unhealthyThreshold);
    this._healtyStatesBuffer = new StateRingBuffer(this.healthcheck.healthyThreshold);
    this._templates = templates;

    if (targets) {
      this.setupNotificationsTargets(targets)
    }
  }

  setupNotificationsTargets(targets) {
    this._targets = [];
    for (let [targetName, targetConfig] of pairs(targets)) {
      if (!targetConfig) { //skip undefined targets
        continue;
      }

      const options = _.clone(targetConfig);

      if (options.templateName) {
        assert(this._templates[options.templateName], `template ${options.templateName} is not found in "templates" section`);
        options.template = this._templates[options.templateName]
      } else if (options.templateFile) {
        options.template = fs.readFileSync(options.templateFile, 'utf8');
      }

      this._targets.push(Target.init(targetName, options));
    }
  }

  notifyNonActiveState(oldState, newState) {
    (async () => {
      let {
        state,
        name: serviceName,
        accountId: envId,
        environmentId: stackId,
        id: serviceId,
      } = this.service;

      let serviceUrl = this._rancher.buildUrl(`/env/${envId}/apps/stacks/${stackId}/services/${serviceId}/containers`);
      let stackUrl = this._rancher.buildUrl(`/env/${envId}/apps/stacks/${stackId}`);
      let stack = await this._rancher.getStack(stackId);
      let environment = await this._rancher.getCurrentEnvironment();
      let environmentUrl = this._rancher.buildUrl(`/env/${envId}`);

      for (let target of this._targets) {
        target.notify({
          service: this.service, // service object with a full list of properties (see Rancher API)
          state, // rancher service state
          monitorState: newState, // rancher-alarms service state - always degraded
          serviceName,
          serviceUrl, // url to a running service in a rancher UI
          stackUrl, // url to stack in a rancher UI
          stack, // stack object with a full list of properties (see Rancher API)
          stackName: stack.name,
          environment, // environment object with a full list of properties (see Rancher API)
          environmentName: environment.name,
          environmentUrl, // url to environment in a rancher UI
        })
      }
    })();
  }

  _pushState(state) {
    this.prevState = this.state;
    this.state = state;
    this._unhealtyStatesBuffer.push(state);
    this._healtyStatesBuffer.push(state);
    trace(`${this.name} buffers:\n \thealthy: ${this._healtyStatesBuffer} \n\tunhealthy: ${this._unhealtyStatesBuffer}`);
  }

  updateState(newState) {
    this._pushState(newState);

    if (this.prevState !== this.state) {
      info(`service ${padRight(this.name, 15)} ${this.prevState || 'unknown'} -> ${this.state}`);
    }

    if (this._isHealthy && this._unhealtyStatesBuffer.validateState('degraded')) {
      this.notifyNonActiveState(this.prevState, this.state);
      this._isHealthy = false;
      info(`service ${padRight(this.name, 15)} became UNHEALTHY with threshold ${this._unhealtyStatesBuffer.length}`);
    } else if (!this._isHealthy && this._healtyStatesBuffer.validateState('active')) {
      this._isHealthy = true;
      info(`service ${padRight(this.name, 15)} became HEALTY with threshold ${this._healtyStatesBuffer.length}`);
    }
  }

  start() {
    this.stop();
    info(`start polling ${this.name}`);
    this._pollCanceled = false;

    (async () => {
      while (!this._pollCanceled) {
        await delay(this.healthcheck.pollInterval);
        await this._tick();
      }
    })();
  }

  async _tick() {
    let newState;

    this.service = await this._rancher.getService(this.service.id);
    trace(`poll ${this.name}`);

    if (this.service.state == 'updating-active') {
      newState = 'degraded';
    } else if (this.service.state == 'active') {
      if (this.service.launchConfig && this.service.launchConfig.healthCheck) {
        const containers = await this._rancher.getServiceContainers(this.service.id);

        const hasUnhealthyContainers = _(this._withoutSidekicks(containers))
          .filter((c) => c.state == 'running')
          .some((c) => (c.healthState !== 'healthy'));

        newState = hasUnhealthyContainers ? 'degraded' : 'active';
      } else {
        newState = 'active';
      }
    } else {
      newState = this.service.state;
    }

    this.updateState(newState);
  }

  _withoutSidekicks(containers) {
    return containers.filter(({name}) => name.split('_').length <= 3 );
    //const byDeployUnit = {};
    //let results = [];
    //
    //for (let container of containers) {
    //  let unit;
    //  if (unit = container.labels['io.rancher.service.deployment.unit']) {
    //    if (!byDeployUnit[unit]) {
    //      byDeployUnit[unit] = [container]
    //    } else {
    //      byDeployUnit[unit].push(container);
    //    }
    //  }
    //}
    //
    //for (let [unitId, unitContainers] of pairs(byDeployUnit)) {
    //  const sidekicks = _(unitContainers)
    //    .map((c) => c.labels['io.rancher.sidekicks'] && c.labels['io.rancher.sidekicks'].split(','))
    //    .compact()
    //    .flatten()
    //    .uniq();
    //
    //  results = results.concat(unitContainers.filter(({name}) => {
    //    const re = new RegExp(`${this.stackName}_${this.service.name}_(.*)_\\d`);
    //    const match = name.match(re);
    //    if (!match) {
    //      error(`failed to extract container_name from ${name} with regex ${re}`)
    //    }
    //    const serviceName = match && match[1];
    //    info(`serviceName ${serviceName} extracted from ${name}`);
    //    return sidekicks.indexOf(serviceName) == -1;
    //  }));
    //}
    //return results;
  }

  stop() {
    if (this._pollCanceled !== undefined && !this._pollCanceled) {
      info(`stop polling ${this.name}`);
      this._pollCanceled = true;
    }
  }

  toString() {
    return `${this.name}:
  targets: ${stringify(invoke(this._targets, 'toString').join(''))}
  healthcheck: ${stringify(this.healthcheck)}
`
  }

};

function stringify(obj) {
  return JSON.stringify(obj, null, 4);
}
