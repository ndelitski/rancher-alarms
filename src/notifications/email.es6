import NotificationTarget from './target';
import assert from 'assert';
import {isArray} from 'lodash';
import {info} from '../log';
import nodemailer from 'nodemailer';
import {all, promisifyAll} from 'bluebird';

export default class EmailTarget extends NotificationTarget {
  constructor({recipients, smtp}) {
    super();
    assert(recipients, '`recipients` is missing');
    assert(isArray(recipients), '`recipients` expected as array of email');
    assert(smtp);
    assert(smtp.host);
    assert(smtp.port);
    assert(smtp.from);

    if (smtp.auth) {
      assert(smtp.auth.user);
      assert(smtp.auth.password);
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

  async notify(message) {
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
