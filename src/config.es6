import path from 'path';
import fs from 'fs';
import {promisify} from 'bluebird';
import {info} from './log';

const readFile = promisify(fs.readFile);
const {CONFIG_FILE} = process.env;
const DEFAULT_CONFIG_FILE = path.join(__dirname, '../config.json');

export default async function resolveConfig() {
  if (CONFIG_FILE) {
    info(`reading config from file ${CONFIG_FILE}`);
    return await fileSource(CONFIG_FILE);
  } else if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
    info(`reading config from file ${DEFAULT_CONFIG_FILE}`);
    return await fileSource(DEFAULT_CONFIG_FILE);
  } else {
    info('trying to compose config from env variables');
    return await envSource();
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
    RANCHER_PROJECT_ID,
    ALARM_POLL_INTERVAL,
    ALARM_FILTER,
    ALARM_EMAIL_ADDRESSES,
    ALARM_EMAIL_USER,
    ALARM_EMAIL_PASS,
    ALARM_EMAIL_SSL,
    ALARM_EMAIL_SMTP_HOST,
    ALARM_EMAIL_SMTP_PORT,
    ALARM_EMAIL_FROM,
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
  } = process.env;

  let emailAuth;

  if (ALARM_EMAIL_USER || ALARM_EMAIL_PASS) {
   emailAuth = {
     user: ALARM_EMAIL_USER,
     password: ALARM_EMAIL_PASS
   }
  }

  return {
    rancher: {
      address: RANCHER_ADDRESS,
      auth: {
        accessKey: RANCHER_ACCESS_KEY,
        secretKey: RANCHER_SECRET_KEY
      },
      projectId: RANCHER_PROJECT_ID
    },
    pollServicesInterval: ALARM_POLL_INTERVAL || 60000,
    filter: ALARM_FILTER && ALARM_FILTER.split(','),
    notifications: {
      '*': {
        targets: {
          email: ALARM_EMAIL_FROM && {
            recipients: ALARM_EMAIL_ADDRESSES && ALARM_EMAIL_ADDRESSES.split(',') || []
          },
          slack: ALARM_SLACK_WEBHOOK_URL && {
            template: ALARM_SLACK_TEMPLATE,
            templateFile: ALARM_SLACK_TEMPLATE_FILE
          }
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
          "secureConnection": ALARM_EMAIL_SSL || true,
          "port": ALARM_EMAIL_SMTP_PORT || 465
        },
        template: ALARM_EMAIL_TEMPLATE,
        templateFile: ALARM_EMAIL_TEMPLATE_FILE
      },
      slack: ALARM_SLACK_WEBHOOK_URL && {
        webhookUrl: ALARM_SLACK_WEBHOOK_URL,
        channel: ALARM_SLACK_CHANNEL,
        botName: ALARM_SLACK_BOTNAME
      }
    }
  }
}
