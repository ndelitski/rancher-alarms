import NotificationTarget from './target';
import assert from 'assert';
import {info} from '../log';
import axios from 'axios';
import base64 from 'js-base64';

export default class GraphiteTarget extends NotificationTarget {
  constructor({webhookUrl, tagName, GraphiteLogin, GraphitePass}) {
    super();
    assert(webhookUrl, '`webhookUrl` is missing');
    this._url = webhookUrl;
    this._tagName = tagName;
    this._GraphiteLogin = GraphiteLogin;
    this._GraphitePass = GraphitePass;
    this._AuthHeader = base64.Base64.encode(GraphiteLogin+":"+GraphitePass);
  }

  async notify(data) {
    const webhookPayload = {
      what: data['serviceName'],
      tags: this._tagName,
      data: data['stackName']
    };

    await axios({url: this._url, headers: {'Authorization': "Basic "+this._AuthHeader}, method: 'POST', data: webhookPayload});

    info(`sent event to Graphite tag:${this._tags || 'default'}, text: ${webhookPayload.text}`)
  }

  toString() {
    const options = {
      webhookUrl: this._webhookUrl,
      tagName: this._tagName,
      login: this._GraphiteLogin,
      pass: this._GraphitePass
    };

    return `(GraphiteTarget ${JSON.stringify(options)})`
  }
}
