import NotificationTarget from './target';
import assert from 'assert';
import {info} from '../log';
import axios from 'axios';
import renderTemplate from '../render-template';

const HIPCHAT_TEMPLATE = `service #{serviceName} in stack #{stackName} became #{monitorState} (#{state}) link: #{serviceUrl}`;

export default class HipchatTarget extends NotificationTarget {
  constructor({webhookUrl, notify, template = HIPCHAT_TEMPLATE}) {
    super();
    assert(webhookUrl, '`webhookUrl` is missing');
    this._url = webhookUrl;
    this._messageTemplate = template;
    this._notify = notify;
  }

  async notify(data) {
    const webhookPayload = {
      color: 'red',
      notify: this._notify,
      message_format: 'text',
      message: renderTemplate(this._messageTemplate, data)
    };

    await axios({url: this._url, method: 'POST', data: webhookPayload});

    info(`sent event to Hipchat ${webhookPayload.message}`)
  }

  toString() {
    const options = {
      webhookUrl: this._webhookUrl,
      tagName: this._tagName,
      notify: this._notify
    };

    return `(HipchatTarget ${JSON.stringify(options)})`
  }
}
