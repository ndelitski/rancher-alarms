import NotificationTarget from './target';
import assert from 'assert';
import {info} from '../log';
import axios from 'axios';
import renderTemplate from '../render-template';

const SLACK_TEMPLATE = `service <#{serviceUrl}|#{serviceName}> in stack <#{stackUrl}|#{stackName}> become #{monitorState} (#{state})`;

export default class SlackTarget extends NotificationTarget {
  constructor({webhookUrl, channel}) {
    super();
    assert(webhookUrl, '`webhookUrl` is missing');
    this._channel = channel;
    this._url = webhookUrl;
  }

  async notify(data) {
    await axios({url: this._url, method: 'POST', data: {
      channel: this._channel,
      text: renderTemplate(SLACK_TEMPLATE, data)
    }});

    info(`sent email notification to SLACK`)
  }

  toString() {
    return `[SlackTarget]`
  }
}
