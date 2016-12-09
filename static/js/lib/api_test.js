import { assert } from 'chai';
import fetchMock from 'fetch-mock/src/server';
import sinon from 'sinon';

import {
  getUserProfile,
  patchUserProfile,
  getDashboard,
  getCoursePrices,
  getCookie,
  fetchJSONWithCSRF,
  fetchWithCSRF,
  csrfSafeMethod,
  checkout,
  sendSearchResultMail,
  getPrograms,
  addProgramEnrollment,
  updateProfileImage,
  addFinancialAid,
  skipFinancialAid,
  updateDocumentSentDate,
  addCourseEnrollment,
} from './api';
import * as api from './api';
import {
  CYBERSOURCE_CHECKOUT_RESPONSE,
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  USER_PROFILE_RESPONSE,
  PROGRAMS,
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

    for (let cookie of document.cookie.split(";")) {
      let key = cookie.split("=")[0].trim();
      document.cookie = `${key}=`;
    }
  });

  describe('REST functions', () => {
    let fetchJSONStub;
    let fetchStub;
    beforeEach(() => {
      fetchJSONStub = sandbox.stub(api, 'fetchJSONWithCSRF');
      fetchStub = sandbox.stub(api, 'fetchWithCSRF');
    });

    it('gets user profile', () => {
      fetchJSONStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
      return getUserProfile('jane').then(receivedUserProfile => {
        assert.ok(fetchJSONStub.calledWith('/api/v0/profiles/jane/'));
        assert.deepEqual(receivedUserProfile, USER_PROFILE_RESPONSE);
      });
    });

    it('fails to get user profile', () => {
      fetchJSONStub.returns(Promise.reject());

      return assert.isRejected(getUserProfile('jane')).then(() => {
        assert.ok(fetchJSONStub.calledWith('/api/v0/profiles/jane/'));
      });
    });

    it('patches a user profile', () => {
      fetchJSONStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
      patchUserProfile('jane', USER_PROFILE_RESPONSE).then(returnedProfile => {
        assert.ok(fetchJSONStub.calledWith('/api/v0/profiles/jane/', {
          method: 'PATCH',
          body: JSON.stringify(USER_PROFILE_RESPONSE)
        }));
        assert.deepEqual(returnedProfile, USER_PROFILE_RESPONSE);
      });
    });

    it('fails to patch a user profile', () => {
      fetchJSONStub.returns(Promise.reject());
      return assert.isRejected(patchUserProfile('jane', USER_PROFILE_RESPONSE)).then(() => {
        let profileWithoutImage = {...USER_PROFILE_RESPONSE};
        delete profileWithoutImage['image'];
        assert.ok(fetchJSONStub.calledWith('/api/v0/profiles/jane/', {
          method: 'PATCH',
          body: JSON.stringify(profileWithoutImage)
        }));
      });
    });

    describe('updating profile image', () => {
      const checkArgs = () => {
        let [url, obj] = fetchStub.args[0];
        assert.equal(url, '/api/v0/profiles/jane/');
        assert.equal(obj.method, 'PATCH');
        let img = obj.body.get('image');
        assert.equal(img.name, 'a file name');
        assert.equal(img.constructor.name, 'File');
      };

      it('updates a user profile image', () => {
        let blob = new Blob;
        let formData = new FormData;
        formData.append('image', blob, 'a file name');
        fetchStub.returns(Promise.resolve('good response'));
        return updateProfileImage('jane', blob, 'a file name').then(res => {
          assert.equal(res, 'good response');
          checkArgs();
        });
      });

      it('fails to update a user profile image', () => {
        let blob = new Blob;
        fetchStub.returns(Promise.reject());
        return assert.isRejected(updateProfileImage('jane', blob, 'a file name')).then(() => {
          checkArgs();
        });
      });
    });

    it('gets the dashboard', () => {
      fetchJSONStub.returns(Promise.resolve(DASHBOARD_RESPONSE));
      return getDashboard().then(dashboard => {
        assert.ok(fetchJSONStub.calledWith('/api/v0/dashboard/', {}, true));
        assert.deepEqual(dashboard, DASHBOARD_RESPONSE);
      });
    });

    it('fails to get the dashboard', () => {
      fetchJSONStub.returns(Promise.reject());

      return assert.isRejected(getDashboard()).then(() => {
        assert.ok(fetchJSONStub.calledWith('/api/v0/dashboard/', {}, true));
      });
    });

    it('gets course prices', () => {
      fetchJSONStub.returns(Promise.resolve(COURSE_PRICES_RESPONSE));
      return getCoursePrices().then(coursePrices => {
        assert.ok(fetchJSONStub.calledWith(`/api/v0/course_prices/`, {}));
        assert.deepEqual(coursePrices, COURSE_PRICES_RESPONSE);
      });
    });

    it('posts to checkout', () => {
      fetchJSONStub.returns(Promise.resolve(CYBERSOURCE_CHECKOUT_RESPONSE));
      return checkout('course_id').then(checkoutInfo => {
        assert.ok(fetchJSONStub.calledWith('/api/v0/checkout/', {
          method: 'POST',
          body: JSON.stringify({course_id: 'course_id'})
        }));
        assert.deepEqual(checkoutInfo, CYBERSOURCE_CHECKOUT_RESPONSE);
      });
    });

    it('fails to post to checkout', () => {
      fetchJSONStub.returns(Promise.reject());

      return assert.isRejected(checkout('course_id')).then(() => {
        assert.ok(fetchJSONStub.calledWith('/api/v0/checkout/', {
          method: 'POST',
          body: JSON.stringify({course_id: 'course_id'})
        }));
      });
    });

    describe('for email', () => {
      let MAIL_RESPONSE = {errorStatusCode: 200};
      let searchRequest = {size: 50};

      it('returns expected values when a POST to send email succeeds', () => {
        fetchJSONStub.returns(Promise.resolve(MAIL_RESPONSE));
        return sendSearchResultMail('subject', 'body', searchRequest).then(mailResp => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/mail/', {
            method: 'POST',
            body: JSON.stringify({
              email_subject: 'subject',
              email_body: 'body',
              search_request: searchRequest
            })
          }));
          assert.deepEqual(mailResp, MAIL_RESPONSE);
        });
      });

      it('returns a rejected Promise when a POST to send email fails', () => {
        fetchJSONStub.returns(Promise.reject());
        return assert.isRejected(sendSearchResultMail('subject', 'body', searchRequest));
      });
    });

    describe('for program enrollments', () => {
      it('fetches program enrollments successfully', () => {
        fetchJSONStub.returns(Promise.resolve(PROGRAMS));
        return getPrograms().then(enrollments => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/programs/', {}, true));
          assert.deepEqual(enrollments, PROGRAMS);
        });
      });

      it('fails to fetch program enrollments', () => {
        fetchJSONStub.returns(Promise.reject());

        return assert.isRejected(getPrograms()).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/programs/', {}, true));
        });
      });

      it('adds a program enrollment successfully', () => {
        let enrollment = PROGRAMS[0];
        fetchJSONStub.returns(Promise.resolve(enrollment));
        return addProgramEnrollment(enrollment.id).then(enrollmentResponse => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/enrolledprograms/', {
            method: 'POST',
            body: JSON.stringify({program_id: enrollment.id})
          }));
          assert.deepEqual(enrollmentResponse, enrollment);
        });
      });

      it('fails to add a program enrollment', () => {
        fetchJSONStub.returns(Promise.reject());
        let enrollment = PROGRAMS[0];

        return assert.isRejected(addProgramEnrollment(enrollment.id)).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/enrolledprograms/', {
            method: 'POST',
            body: JSON.stringify({program_id: enrollment.id})
          }));
        });
      });
    });

    describe('for adding financial aid', () => {
      it('add financial aid successfully', () => {
        let programId = PROGRAMS[0].id;
        fetchJSONStub.returns(Promise.resolve());

        return addFinancialAid(10000, 'USD', programId).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/financial_aid_request/', {
            method: 'POST',
            body: JSON.stringify({
              original_income: 10000,
              original_currency: 'USD',
              program_id: 3
            })
          }));
        });
      });

      it('fails to add financial aid', () => {
        fetchJSONStub.returns(Promise.reject());

        let programId = PROGRAMS[0].id;

        return assert.isRejected(addFinancialAid(10000, 'USD', programId)).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/financial_aid_request/', {
            method: 'POST',
            body: JSON.stringify({
              original_income: 10000,
              original_currency: 'USD',
              program_id: 3
            })
          }));
        });
      });
    });

    describe('for skipping financial aid', () => {
      let programId = 2;
      it('successfully skips financial aid', () => {
        fetchJSONStub.returns(Promise.resolve());

        return skipFinancialAid(programId).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/financial_aid_skip/2/', {
            method: 'PATCH'
          }));
        });
      });

      it('fails to skip financial aid', () => {
        fetchJSONStub.returns(Promise.reject());

        return assert.isRejected(skipFinancialAid(programId)).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/financial_aid_skip/2/', {
            method: 'PATCH'
          }));
        });
      });
    });

    describe('for updating document sent date', () => {
      it('add updates the document sent date', () => {
        let financialAidId = 123;
        let sentDate = "2012-12-12";
        fetchJSONStub.returns(Promise.resolve());

        return updateDocumentSentDate(financialAidId, sentDate).then(() => {
          assert.ok(fetchJSONStub.calledWith(`/api/v0/financial_aid/${financialAidId}/`, {
            method: 'PATCH',
            body: JSON.stringify({
              date_documents_sent: sentDate
            })
          }));
        });
      });

      it('fails to update the document sent date', () => {
        fetchJSONStub.returns(Promise.reject());

        let financialAidId = 123;
        let sentDate = "2012-12-12";

        return assert.isRejected(updateDocumentSentDate(financialAidId, sentDate)).then(() => {
          assert.ok(fetchJSONStub.calledWith(`/api/v0/financial_aid/${financialAidId}/`, {
            method: 'PATCH',
            body: JSON.stringify({
              date_documents_sent: sentDate
            })
          }));
        });
      });

      it('adds a course enrollment', () => {
        fetchJSONStub.returns(Promise.resolve());

        let courseId = 'course_id';
        return addCourseEnrollment(courseId).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/course_enrollments/', {
            method: 'POST',
            body: JSON.stringify({
              course_id: courseId
            })
          }));
        });
      });

      it('fails to add a course enrollment', () => {
        fetchJSONStub.returns(Promise.reject());

        let courseId = 'course_id';
        return assert.isRejected(addCourseEnrollment(courseId)).then(() => {
          assert.ok(fetchJSONStub.calledWith('/api/v0/course_enrollments/', {
            method: 'POST',
            body: JSON.stringify({
              course_id: courseId
            })
          }));
        });
      });
    });
  });

  describe('fetch functions', () => {
    const CSRF_TOKEN = 'asdf';

    afterEach(() => {
      fetchMock.restore();
    });

    describe('fetchWithCSRF', () => {
      beforeEach(() => {
        document.cookie = `csrftoken=${CSRF_TOKEN}`;
      });

      it('fetches and populates appropriate headers for GET', () => {
        let body = "body";

        fetchMock.mock('/url', (url, opts) => {
          assert.deepEqual(opts, {
            credentials: "same-origin",
            headers: {},
            body: body,
            method: 'GET'
          });

          return {
            status: 200,
            body: "Some text"
          };
        });

        return fetchWithCSRF('/url', {
          body: body
        }).then(responseBody => {
          assert.equal(responseBody, "Some text");
        });
      });

      for (let method of ['PATCH', 'PUT', 'POST']) {
        it(`fetches and populates appropriate headers for ${method}`, () => {
          let body = "body";

          fetchMock.mock('/url', (url, opts) => {
            assert.deepEqual(opts, {
              credentials: "same-origin",
              headers: {
                'X-CSRFToken': CSRF_TOKEN
              },
              body: body,
              method: method
            });

            return {
              status: 200,
              body: "Some text"
            };
          });

          return fetchWithCSRF('/url', {
            body,
            method,
          }).then(responseBody => {
            assert.equal(responseBody, 'Some text');
          });
        });
      }

      for (let statusCode of [199, 300, 400, 500, 100]) {
        it(`rejects the promise if the status code is ${statusCode}`, () => {
          fetchMock.mock('/url', () => {
            return {status: statusCode};
          });

          return assert.isRejected(fetchWithCSRF('/url'));
        });
      }
    });

    describe('fetchJSONWithCSRF', () => {
      it('fetches and populates appropriate headers for JSON', () => {
        document.cookie = `csrftoken=${CSRF_TOKEN}`;
        let expectedJSON = {data: true};

        fetchMock.mock('/url', (url, opts) => {
          assert.deepEqual(opts, {
            credentials: "same-origin",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "X-CSRFToken": CSRF_TOKEN
            },
            body: JSON.stringify(expectedJSON),
            method: "PATCH"
          });
          return {
            status: 200,
            body: '{"json": "here"}'
          };
        });

        return fetchJSONWithCSRF('/url', {
          method: 'PATCH',
          body: JSON.stringify(expectedJSON)
        }).then(responseBody => {
          assert.deepEqual(responseBody, {
            "json": "here"
          });
        });
      });

      it('handles responses with no data', () => {
        document.cookie = `csrftoken=${CSRF_TOKEN}`;
        let expectedJSON = {data: true};

        fetchMock.mock('/url', (url, opts) => {
          assert.deepEqual(opts, {
            credentials: "same-origin",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "X-CSRFToken": CSRF_TOKEN
            },
            body: JSON.stringify(expectedJSON),
            method: "PATCH"
          });
          return {
            status: 200,
          };
        });

        return fetchJSONWithCSRF('/url', {
          method: 'PATCH',
          body: JSON.stringify(expectedJSON)
        }).then(responseBody => {
          assert.deepEqual(responseBody, '');
        });
      });

      for (let statusCode of [199, 300, 400, 500, 100]) {
        it(`rejects the promise if the status code is ${statusCode}`, () => {
          fetchMock.mock('/url', () => {
            return {
              status: statusCode,
              body: JSON.stringify({
                error: "an error"
              })
            };
          });

          return assert.isRejected(fetchJSONWithCSRF('/url')).then(responseBody => {
            assert.deepEqual(responseBody, {
              error: "an error",
              errorStatusCode: statusCode
            });
          });
        });
      }

      for (let statusCode of [400, 401]) {
        it(`redirects to login if we set loginOnError and status = ${statusCode}`, () => {
          fetchMock.mock('/url', () => {
            return {status: statusCode};
          });

          return assert.isRejected(fetchJSONWithCSRF('/url', {}, true)).then(() => {
            assert.equal(savedWindowLocation, '/login/edxorg/');
          });
        });
      }
    });
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
