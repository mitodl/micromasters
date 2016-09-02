import { assert } from 'chai';
import fetchMock from 'fetch-mock/src/server';
import sinon from 'sinon';

import {
  getUserProfile,
  patchUserProfile,
  getDashboard,
  getCookie,
  fetchJSONWithCSRF,
  csrfSafeMethod,
  checkout,
  sendSearchResultMail,
  getProgramEnrollments,
  addProgramEnrollment,
} from './api';
import * as api from './api';
import {
  CHECKOUT_RESPONSE,
  DASHBOARD_RESPONSE,
  USER_PROFILE_RESPONSE,
  PROGRAM_ENROLLMENTS,
} from '../constants';

describe('api', function() {
  this.timeout(5000);  // eslint-disable-line no-invalid-this

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

    it('gets user profile', () => {
      fetchStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
      return getUserProfile('jane').then(receivedUserProfile => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/'));
        assert.deepEqual(receivedUserProfile, USER_PROFILE_RESPONSE);
      });
    });

    it('fails to get user profile', () => {
      fetchStub.returns(Promise.reject());

      return assert.isRejected(getUserProfile('jane')).then(() => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/'));
      });
    });

    it('patches a user profile', () => {
      fetchStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
      fetchMock.mock('/api/v0/profiles/jane/', (url, opts) => {
        assert.deepEqual(JSON.parse(opts.body), USER_PROFILE_RESPONSE);
        return { status: 200 };
      });
      return patchUserProfile('jane', USER_PROFILE_RESPONSE).then(returnedProfile => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/', {
          method: 'PATCH',
          body: JSON.stringify(USER_PROFILE_RESPONSE)
        }));
        assert.deepEqual(returnedProfile, USER_PROFILE_RESPONSE);
      });
    });

    it('fails to patch a user profile', () => {
      fetchStub.returns(Promise.reject());
      return assert.isRejected(patchUserProfile('jane', USER_PROFILE_RESPONSE)).then(() => {
        assert.ok(fetchStub.calledWith('/api/v0/profiles/jane/', {
          method: 'PATCH',
          body: JSON.stringify(USER_PROFILE_RESPONSE)
        }));
      });
    });

    it('gets the dashboard', () => {
      fetchStub.returns(Promise.resolve(DASHBOARD_RESPONSE));
      return getDashboard().then(dashboard => {
        assert.ok(fetchStub.calledWith('/api/v0/dashboard/', {}, true));
        assert.deepEqual(dashboard, DASHBOARD_RESPONSE);
      });
    });

    it('fails to get the dashboard', () => {
      fetchStub.returns(Promise.reject());

      return assert.isRejected(getDashboard()).then(() => {
        assert.ok(fetchStub.calledWith('/api/v0/dashboard/', {}, true));
      });
    });

    it('posts to checkout', () => {
      fetchStub.returns(Promise.resolve(CHECKOUT_RESPONSE));
      fetchMock.mock('/api/v0/checkout/', (url, opts) => {
        assert.deepEqual(JSON.parse(opts.body), CHECKOUT_RESPONSE);
        return { status: 200 };
      });
      return checkout('course_id').then(checkoutInfo => {
        assert.ok(fetchStub.calledWith('/api/v0/checkout/', {
          method: 'POST',
          body: JSON.stringify({course_id: 'course_id'})
        }));
        assert.deepEqual(checkoutInfo, CHECKOUT_RESPONSE);
      });
    });

    it('fails to post to checkout', () => {
      fetchStub.returns(Promise.reject());

      return assert.isRejected(checkout('course_id')).then(() => {
        assert.ok(fetchStub.calledWith('/api/v0/checkout/', {
          method: 'POST',
          body: JSON.stringify({course_id: 'course_id'})
        }));
      });
    });

    describe('for email', () => {
      let MAIL_RESPONSE = {errorStatusCode: 200};
      let searchRequest = {size: 50};

      it('returns expected values when a POST to send email succeeds', () => {
        fetchStub.returns(Promise.resolve(MAIL_RESPONSE));
        fetchMock.mock('/api/v0/mail/', (url, opts) => {  // eslint-disable-line no-unused-vars
          return {status: 200};
        });
        return sendSearchResultMail('subject', 'body', searchRequest).then(mailResp => {
          assert.ok(fetchStub.calledWith('/api/v0/mail/', {
            method: 'POST',
            body: JSON.stringify({
              email_subject: 'subject',
              email_body: 'body',
              searchRequest: searchRequest
            })
          }));
          assert.deepEqual(mailResp, MAIL_RESPONSE);
        });
      });

      it('returns a rejected Promise when a POST to send email fails', () => {
        fetchStub.returns(Promise.reject());
        return assert.isRejected(sendSearchResultMail('subject', 'body', searchRequest));
      });
    });

    describe('for program enrollments', () => {
      it('fetches program enrollments successfully', () => {
        fetchStub.returns(Promise.resolve(PROGRAM_ENROLLMENTS));
        return getProgramEnrollments().then(enrollments => {
          assert.ok(fetchStub.calledWith('/api/v0/enrolledprograms/', {}, true));
          assert.deepEqual(enrollments, PROGRAM_ENROLLMENTS);
        });
      });

      it('fails to fetch program enrollments', () => {
        fetchStub.returns(Promise.reject());

        return assert.isRejected(getProgramEnrollments()).then(() => {
          assert.ok(fetchStub.calledWith('/api/v0/enrolledprograms/', {}, true));
        });
      });

      it('adds a program enrollment successfully', () => {
        let enrollment = PROGRAM_ENROLLMENTS[0];
        fetchStub.returns(Promise.resolve(enrollment));
        fetchMock.mock('/api/v0/enrolledprograms/', (url, opts) => {
          assert.deepEqual(JSON.parse(opts.body), enrollment);
          return { status: 200 };
        });
        return addProgramEnrollment(enrollment.id).then(enrollmentResponse => {
          assert.ok(fetchStub.calledWith('/api/v0/enrolledprograms/', {
            method: 'POST',
            body: JSON.stringify({program_id: enrollment.id})
          }));
          assert.deepEqual(enrollmentResponse, enrollment);
        });
      });

      it('fails to add a program enrollment', () => {
        fetchStub.returns(Promise.reject());
        let enrollment = PROGRAM_ENROLLMENTS[0];

        return assert.isRejected(addProgramEnrollment(enrollment.id)).then(() => {
          assert.ok(fetchStub.calledWith('/api/v0/enrolledprograms/', {
            method: 'POST',
            body: JSON.stringify({program_id: enrollment.id})
          }));
        });
      });
    });
  });

  describe('fetchJSONWithCSRF', () => {
    it('fetches and populates appropriate headers for JSON', () => {
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

      return fetchJSONWithCSRF('/url', {
        method: 'PATCH',
        body: JSON.stringify(expectedJSON)
      });
    });

    for (let statusCode of [199, 300, 400, 500, 100]) {
      it(`rejects the promise if the status code is ${statusCode}`, () => {
        fetchMock.mock('/url', () => {
          return { status: statusCode };
        });

        return assert.isRejected(fetchJSONWithCSRF('/url'));
      });
    }

    for (let statusCode of [400, 401]) {
      it(`redirects to login if we set loginOnError and status = ${statusCode}`, () => {
        fetchMock.mock('/url', () => {
          return {status: 400};
        });

        return assert.isRejected(fetchJSONWithCSRF('/url', {}, true)).then(() => {
          assert.equal(savedWindowLocation, '/login/edxorg/');
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
