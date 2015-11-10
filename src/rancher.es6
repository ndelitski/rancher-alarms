import axios from 'axios';
import assert from 'assert';
import {merge, omit} from 'lodash';
import $url from 'url';

export default class RancherClient {
  constructor({address, auth, projectId}) {
    assert(address, '`address` is missing');
    assert(projectId, '`projectId` is missing');

    if (auth) {
      assert(auth.accessKey, '`auth.accessKey` is missing');
      assert(auth.secretKey, '`auth.secretKey` is missing');
      this._auth = {user: auth.accessKey, password: auth.secretKey};
    }

    if (!address.match(/^http/)) {
      address = 'http://' + address;
    }

    this.address = address;
    this.projectId = projectId;
  }

  async _request(options) {
    assert(options.url);

    try {
      const res = await axios(merge(options, {
        url: $url.resolve(this.address, options.url),
        headers: this._auth ? {
          'Authorization': 'Basic ' + new Buffer(this._auth.user + ':' + this._auth.password).toString('base64')
        } : {},
        responseType: 'json'
      }));

      return res.data
    }
    catch (resp) {
      throw new Error('RancherClientError: non-200 code response ' + JSON.stringify(resp, null, 4));
    }
  }

  async getServices() {
    return (await this._request({
      url: `/v1/projects/${this.projectId}/services`
    })).data;
  }

  async getStacks() {
    return (await this._request({
      url: `/v1/projects/${this.projectId}/environments`
    })).data;
  }

  async getService(serviceId) {
    return await this._request({
      url: `/v1/projects/${this.projectId}/services/${serviceId}`
    });
  }

  async getServiceContainers(serviceId) {
    return (await this._request({
      url: `/v1/projects/${this.projectId}/services/${serviceId}/instances`
    })).data;
  }

  buildUrl(path) {
    return $url.resolve(this.address, path);
  }

}
