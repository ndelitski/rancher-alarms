import NotificationTarget from './target';
import assert from 'assert';
import {isArray} from 'lodash';
import {info} from '../log';
import nodemailer from 'nodemailer';
import {all, promisifyAll} from 'bluebird';
import renderTemplate from '../render-template';

const EMAIL_TEMPLATE = `service #{serviceName} become #{monitorState} (#{state})
service: #{serviceUrl}
stack: #{stackUrl}
`;

export default class EmailTarget extends NotificationTarget {
  constructor({recipients, smtp}) {
    super();
    assert(recipients, '`recipients` is missing');
    assert(isArray(recipients), '`recipients` expected as array of email');
    assert(smtp, '`smtp` is missing');
    assert(smtp.host, '`smtp.host` is missing');
    assert(smtp.port, '`smtp.port` is missing');
    assert(smtp.from, '`smtp.from` is missing');

    if (smtp.auth) {
      assert(smtp.auth.user, '`smtp.auth.user` is missing');
      assert(smtp.auth.password, '`smtp.auth.password` is missing');
    }

    this._recipients = recipients;
    this._smtpSettings = smtp;
    this._sender = promisifyAll(nodemailer.createTransport({
      port: smtp.port,
      host: smtp.host,
      from: smtp.from,
      auth: smtp.auth && {
        user: smtp.auth.user,
        pass: smtp.auth.password
      },
      secure: smtp.secureConnection
    }));
  }

  async notify(data) {
    let message = renderTemplate(EMAIL_TEMPLATE, data);

    all(this._recipients).map((to) => {
      info(`sending email notification to ${to}`);
      return this._sender.sendMailAsync({
        from: this._smtpSettings.from,
        to,
        subject: 'Unhealth service alarm',
        text: message
      }).then((result)=> {
        info(`sent email notification to ${to} ${JSON.stringify(result, null, 4)}`)
      });
    }, {concurrency: 5});
  }

  toString() {
    return `email:
  recipients: ${this._recipients}`
  }
}
