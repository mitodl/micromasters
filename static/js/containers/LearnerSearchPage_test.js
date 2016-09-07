/* global SETTINGS: false */
// import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import IntegrationTestHelper from '../util/integration_test_helper';
import { ELASTICSEARCH_RESPONSE } from '../constants';

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
      assert(!_.isEmpty(server.requests));
      let request = server.requests[0];
      throw "";
    });
  });

  it("doesn't filter by program id for current enrollment if it's not set to anything", () => {

    return renderComponent('/learners').then(() => {
      assert(!_.isEmpty(server.requests));
      let request = server.requests[0];
      throw "";
    });
  });
});
