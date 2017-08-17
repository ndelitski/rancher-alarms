import {info} from '../log';
import assert from 'assert';

const VALID_TARGETS = ['email', 'slack', 'hipchat', 'graphite'];

export default class NotificationTarget {
  async notify(message) {
    info(message);
  }
  static init(name, options) {
    assert(VALID_TARGETS.indexOf(name) !== -1, `invalid notification target '${name}'`);
    return new (require('./' + name))(options);
  }
}
