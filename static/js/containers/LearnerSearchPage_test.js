/* global SETTINGS: false */
// import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import IntegrationTestHelper from '../util/integration_test_helper';
import {
  PROGRAM_ENROLLMENTS,
  ELASTICSEARCH_RESPONSE,
} from '../constants';
import {
  setCurrentProgramEnrollment,

  SET_CURRENT_PROGRAM_ENROLLMENT,
} from '../actions/enrollments';

describe('LearnerSearchPage', function () {
  let renderComponent, helper, server;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    renderComponent = helper.renderComponent.bind(helper);
    server = helper.sandbox.useFakeServer();
    server.respondWith("POST", "http://localhost:9200/_search", [
      200, { "Content-Type": "application/json" }, JSON.stringify(ELASTICSEARCH_RESPONSE)
    ]);
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('calls the elasticsearch API', () => {
    assert(_.isEmpty(server.requests));
    return renderComponent('/learners').then(() => {
      assert(!_.isEmpty(server.requests));
      let request = server.requests[0];
      assert.deepEqual(request.url, "/_search");
      assert.deepEqual(request.method, "POST");
    });
  });

  it('filters by program id for current enrollment', () => {
    return renderComponent('/learners').then(() => {
      let request = server.requests[server.requests.length - 1];
      let body = JSON.parse(request.requestBody);
      assert.deepEqual(body.filter.bool.must[0].term['program.id'], PROGRAM_ENROLLMENTS[0].id);
    });
  });

  it("doesn't filter by program id for current enrollment if it's not set to anything", () => {
    helper.enrollmentsGetStub.returns(Promise.resolve([]));

    return renderComponent('/learners').then(() => {
      let request = server.requests[server.requests.length - 1];
      let body = JSON.parse(request.requestBody);
      assert.equal(body.filter, undefined);
    });
  });

  it("refreshes the search when the current enrollment is updated", () => {
    return renderComponent('/learners').then(() => {
      let searchCount = server.requests.length;

      return helper.dispatchThen(
        setCurrentProgramEnrollment(PROGRAM_ENROLLMENTS[1]),
        [SET_CURRENT_PROGRAM_ENROLLMENT]
      ).then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            assert.equal(server.requests.length, searchCount + 1);
            let lastRequest = server.requests[server.requests.length - 1];
            let body = JSON.parse(lastRequest.requestBody);
            console.log(JSON.stringify(body.filter.bool.must, null, 4));
            assert.equal(body.filter.bool.must[0].term['program.id'], PROGRAM_ENROLLMENTS[1].id);
            resolve();
          }, 300);
        });
      });
    });
  });
});
