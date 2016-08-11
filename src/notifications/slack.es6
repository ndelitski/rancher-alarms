import NotificationTarget from './target';
import assert from 'assert';
import {info} from '../log';
import axios from 'axios';
import renderTemplate from '../render-template';

const SLACK_TEMPLATE = `service <#{serviceUrl}|#{serviceName}> in stack <#{stackUrl}|#{stackName}> become #{monitorState} (#{state})`;

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
    const webhookPayload = {
      channel: this._channel,
      username: this._botName,
      text: renderTemplate(this._messageTemplate, data)
    };

    await axios({url: this._url, method: 'POST', data: webhookPayload});

    info(`sent email notification to SLACK channel:${this._channel || 'default'}, text: ${webhookPayload.text}`)
  }

  toString() {
    const options = {
      channel: this._channel,
      webhookUrl: this._webhookUrl,
      botName: this._botName,
      template: this._messageTemplate
    };

    return `(SlackTarget ${JSON.stringify(options)})`
  }
}
