import assert from 'assert';
import fetchMock from 'fetch-mock/src/server';
import sinon from 'sinon';

import {
  getUserProfile,
  patchUserProfile,
  getDashboard,
  getCookie,
  fetchJSONWithCSRF,
  csrfSafeMethod,
} from './api';
import * as api from './api';
import {
  USER_PROFILE_RESPONSE,
  DASHBOARD_RESPONSE,
} from '../constants';

describe('api', function() {
  let sandbox;
  let savedWindowLocation;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    savedWindowLocation = null;
    Object.defineProperty(window, "location", {
      set: value => {
        savedWindowLocation = value;
      }
    });
  });
  afterEach(function() {
    sandbox.restore();
    fetchMock.restore();

    for (let cookie of document.cookie.split(";")) {
      let key = cookie.split("=")[0].trim();
      document.cookie = `${key}=`;
    }
  });

  describe('REST functions', () => {
    let fetchStub;
    beforeEach(() => {
      fetchStub = sandbox.stub(api, 'fetchJSONWithCSRF');
    });

    it('gets user profile', done => {
      fetchStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
      getUserProfile('jane').then(receivedUserProfile => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/'));
        assert.deepEqual(receivedUserProfile, USER_PROFILE_RESPONSE);
        done();
      });
    });

    it('fails to get user profile', done => {
      fetchStub.returns(Promise.reject());

      getUserProfile('jane').catch(() => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/'));
        done();
      });
    });

    it('patches a user profile', done => {
      fetchStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
      fetchMock.mock('/api/v0/profiles/jane/', (url, opts) => {
        assert.deepEqual(JSON.parse(opts.body), USER_PROFILE_RESPONSE);
        return { status: 200 };
      });
      patchUserProfile('jane', USER_PROFILE_RESPONSE).then(returnedProfile => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/', {
          method: 'PATCH',
          body: JSON.stringify(USER_PROFILE_RESPONSE)
        }));
        assert.deepEqual(returnedProfile, USER_PROFILE_RESPONSE);
        done();
      });
    });

    it('fails to patch a user profile', done => {
      fetchStub.returns(Promise.reject());
      patchUserProfile('jane', USER_PROFILE_RESPONSE).catch(() => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/', {
          method: 'PATCH',
          body: JSON.stringify(USER_PROFILE_RESPONSE)
        }));
        done();
      });
    });

    it('gets the dashboard', done => {
      fetchStub.returns(Promise.resolve(DASHBOARD_RESPONSE));
      getDashboard().then(dashboard => {
        assert.ok(fetchStub.calledWith('/api/v0/dashboard/', {}, true));
        assert.deepEqual(dashboard, DASHBOARD_RESPONSE);
        done();
      });
    });

    it('fails to get the dashboard', done => {
      fetchStub.returns(Promise.reject());

      getDashboard().catch(() => {
        assert.ok(fetchStub.calledWith('/api/v0/dashboard/', {}, true));
        done();
      });
    });
  });

  describe('fetchJSONWithCSRF', () => {
    it('fetches and populates appropriate headers for JSON', done => {
      document.cookie = "csrftoken=asdf";
      let expectedJSON = { data: true };

      fetchMock.mock('/url', (url, opts) => {
        assert.deepEqual(opts, {
          credentials: "same-origin",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": "asdf"
          },
          body: JSON.stringify(expectedJSON),
          method: "PATCH"
        });
        return {status: 200};
      });

      fetchJSONWithCSRF('/url', {
        method: 'PATCH',
        body: JSON.stringify(expectedJSON)
      }).then(() => {
        done();
      });
    });

    for (let statusCode of [199, 300, 400, 500, 100]) {
      it(`rejects the promise if the status code is ${statusCode}`, done => {
        fetchMock.mock('/url', () => {
          return { status: statusCode };
        });

        fetchJSONWithCSRF('/url').catch(() => {
          done();
        });
      });
    }

    for (let statusCode of [400, 401]) {
      it(`redirects to login if we set loginOnError and status = ${statusCode}`, done => {
        fetchMock.mock('/url', () => {
          return {status: 400};
        });

        fetchJSONWithCSRF('/url', {}, true).catch(() => {
          assert.equal(savedWindowLocation, '/login/edxorg/');
          done();
        });
      });
    }
  });

  describe('getCookie', () => {
    it('gets a cookie', () => {
      document.cookie = 'key=cookie';
      assert.equal('cookie', getCookie('key'));
    });

    it('handles multiple cookies correctly', () => {
      document.cookie = 'key1=cookie1';
      document.cookie = 'key2=cookie2';
      assert.equal('cookie1', getCookie('key1'));
      assert.equal('cookie2', getCookie('key2'));
    });
    it('returns null if cookie not found', () => {
      assert.equal(null, getCookie('unknown'));
    });
  });

  describe('csrfSafeMethod', () => {
    it('knows safe methods', () => {
      for (let method of ['GET', 'HEAD', 'OPTIONS', 'TRACE']) {
        assert.ok(csrfSafeMethod(method));
      }
    });
    it('knows unsafe methods', () => {
      for (let method of ['PATCH', 'PUT', 'DELETE', 'POST']) {
        assert.ok(!csrfSafeMethod(method));
      }
    });
  });
});
