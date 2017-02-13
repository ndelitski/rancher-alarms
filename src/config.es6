import path from 'path';
import fs from 'fs';
import {promisify} from 'bluebird';
import {info} from './log';
import envToObject from './env-to-object';
import RancherClient from './rancher';
import _ from 'lodash';

const readFile = promisify(fs.readFile);
const CONFIG_SEARCH_LOCATIONS = [
  path.resolve(__dirname, '..'),
  process.cwd(),
  '/etc/rancher-alarms'
];

export default async function resolveConfig() {
  let configFile = process.env.ALARM_CONFIG_FILE || process.env.CONFIG_FILE;

  // if config is set with env variable we should ensure that file exists
  if (configFile && !fs.lstatSync(configFile)) {
    throw Error(`config file was not found: ${configFile}`)
  }

  if (!configFile) {
    // if no config is given – check default directories
    configFile = _.find(_.map(CONFIG_SEARCH_LOCATIONS,
        (dir) => path.join(dir, 'config.json')), fileExists
    )
  }

  if (configFile) {
    info(`reading config from file ${configFile}`);
    return await fileSource(configFile);
  } else {
    info('composing config from env variables');
    return await envSource();
  }
}

function fileExists(path) {
  try {
    fs.lstatSync(path);
    return true;
  } catch (err) {
    return false
  }
}

async function fileSource(filePath) {
  const contents = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(contents);
  return parsed;
}

async function envSource() {
  const {
    RANCHER_ADDRESS,
    RANCHER_ACCESS_KEY,
    RANCHER_SECRET_KEY,
    CATTLE_URL,
    CATTLE_SECRET_KEY,
    CATTLE_ACCESS_KEY,
    ALARM_POLL_INTERVAL,
    ALARM_FILTER,
    ALARM_EMAIL_ADDRESSES,
    ALARM_EMAIL_USER,
    ALARM_EMAIL_PASS,
    ALARM_EMAIL_SSL,
    ALARM_EMAIL_SMTP_HOST,
    ALARM_EMAIL_SMTP_PORT,
    ALARM_EMAIL_FROM,
    ALARM_EMAIL_SUBJECT,
    ALARM_EMAIL_TEMPLATE,
    ALARM_EMAIL_TEMPLATE_FILE,
    ALARM_MONITOR_INTERVAL,
    ALARM_MONITOR_HEALTHY_THRESHOLD,
    ALARM_MONITOR_UNHEALTHY_THRESHOLD,
    ALARM_SLACK_WEBHOOK_URL,
    ALARM_SLACK_CHANNEL,
    ALARM_SLACK_BOTNAME,
    ALARM_SLACK_TEMPLATE,
    ALARM_SLACK_TEMPLATE_FILE,
    ALARM_GRAPHITE_WEBHOOK_URL,
    ALARM_GRAPHITE_TAG,
    ALARM_GRAPHITE_LOGIN,
    ALARM_GRAPHITE_PASS
  } = process.env;

  let {
    RANCHER_PROJECT_ID,
  } = process.env;

  let emailAuth;

  // if project_id is missing trying to figure out
  if (!RANCHER_PROJECT_ID) {
    let client = new RancherClient({
      address: RANCHER_ADDRESS || CATTLE_URL,
      auth: {
        accessKey: RANCHER_ACCESS_KEY || CATTLE_ACCESS_KEY,
        secretKey: RANCHER_SECRET_KEY || CATTLE_SECRET_KEY
      }
    });

    RANCHER_PROJECT_ID = await client.getCurrentProjectIdAsync();
  }

  if (ALARM_EMAIL_USER || ALARM_EMAIL_PASS) {
   emailAuth = {
     user: ALARM_EMAIL_USER,
     password: ALARM_EMAIL_PASS
   }
  }

  return {
    rancher: {
      address: RANCHER_ADDRESS || CATTLE_URL,
      auth: {
        accessKey: RANCHER_ACCESS_KEY || CATTLE_ACCESS_KEY,
        secretKey: RANCHER_SECRET_KEY || CATTLE_SECRET_KEY
      },
      projectId: RANCHER_PROJECT_ID
    },
    pollServicesInterval: ALARM_POLL_INTERVAL || 60000,
    filter: ALARM_FILTER && ALARM_FILTER.split(','),
    notifications: {
      '*': {
        targets: {
          email: ALARM_EMAIL_FROM && {
            recipients: ALARM_EMAIL_ADDRESSES && ALARM_EMAIL_ADDRESSES.split(',') || [],
            subject: ALARM_EMAIL_SUBJECT
          },
          slack: ALARM_SLACK_WEBHOOK_URL && {
            template: ALARM_SLACK_TEMPLATE,
            templateFile: ALARM_SLACK_TEMPLATE_FILE
          },
          graphite: ALARM_GRAPHITE_WEBHOOK_URL && {
            tagName: ALARM_GRAPHITE_TAG && ALARM_GRAPHITE_TAG.split(',') || []
          },
        },
        healthcheck: {
          pollInterval: ALARM_MONITOR_INTERVAL || 15000,
          healthyThreshold: ALARM_MONITOR_HEALTHY_THRESHOLD || 3,
          unhealthyThreshold: ALARM_MONITOR_UNHEALTHY_THRESHOLD || 4
        }
      }
    },
    targets: {
      email: ALARM_EMAIL_FROM && {
        smtp: {
          from: ALARM_EMAIL_FROM,
          auth: emailAuth,
          "host": ALARM_EMAIL_SMTP_HOST,
          "secureConnection": ALARM_EMAIL_SSL === "true" || ALARM_EMAIL_SSL === undefined,
          "port": ALARM_EMAIL_SMTP_PORT || 465
        },
        template: ALARM_EMAIL_TEMPLATE,
        templateFile: ALARM_EMAIL_TEMPLATE_FILE
      },
      slack: ALARM_SLACK_WEBHOOK_URL && {
        webhookUrl: ALARM_SLACK_WEBHOOK_URL,
        channel: ALARM_SLACK_CHANNEL,
        botName: ALARM_SLACK_BOTNAME || 'rancher-alarms'
      },
      graphite: ALARM_GRAPHITE_WEBHOOK_URL && {
        webhookUrl: ALARM_GRAPHITE_WEBHOOK_URL || 'http://graphite/events/',
        tagName: ALARM_GRAPHITE_TAG || 'alarms',
        GraphiteLogin: ALARM_GRAPHITE_LOGIN || 'guest',
        GraphitePass: ALARM_GRAPHITE_PASS || 'guest'
      }
    }
  }
}
