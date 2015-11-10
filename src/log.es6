import {padRight} from 'lodash';

const LOG_LEVEL = {
  'error': 0,
  'info': 1,
  'trace': 2
};

const verbosity = LOG_LEVEL[process.env.LOG_LEVEL || 'info'];


export function info(...args) {
  log('info', ...args);
}

export function trace(...args) {
  log('trace', ...args);
}

export function error(err) {
  log('error', err, err.stack);
}

function log(severity, ...args) {
  let method;

  if (LOG_LEVEL[severity] > verbosity) {
    return;
  }

  if (severity == 'error') {
    method = 'error';
  } else if (severity == 'trace') {
    method = 'log';
  } else if (severity == 'info') {
    method = 'log';
  } else {
    throw new Error(`unknown severity ${severity}`)
  }

  console[method](padRight(`[${severity.toUpperCase()}]`, 8), padRight(date(), 25), ...args);
}

function date() {
  const dt = new Date();
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()].join('-') + ' ' + [dt.getHours(), dt.getMinutes(), dt.getSeconds(), dt.getMilliseconds()].join(':');
}
