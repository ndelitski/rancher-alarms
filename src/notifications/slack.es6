import NotificationTarget from './target';
import assert from 'assert';
import {info} from '../log';
import axios from 'axios';
import renderTemplate from '../render-template';

const SLACK_TEMPLATE = `service <#{serviceUrl}|#{serviceName}> in stack <#{stackUrl}|#{stackName}> became #{monitorState} (#{state})`;

export default class SlackTarget extends NotificationTarget {
  constructor({webhookUrl, botName, channel, template = SLACK_TEMPLATE}) {
    super();
    assert(webhookUrl, '`webhookUrl` is missing');
    this._channel = channel;
    this._url = webhookUrl;
    this._botName = botName;
    this._messageTemplate = template;
  }

  async notify(data) {
    await axios({url: this._url, method: 'POST', data: {
      channel: this._channel,
      username: this._botName,
      text: renderTemplate(this._messageTemplate, data)
    }});

    info(`sent email notification to SLACK`)
  }

  toString() {
    return `[SlackTarget]`
  }
}
