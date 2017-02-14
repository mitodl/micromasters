/* global SETTINGS: false */
import { assert } from 'chai';
import _ from 'lodash';

import IntegrationTestHelper from '../util/integration_test_helper';
import {
  PROGRAMS,
  ELASTICSEARCH_RESPONSE,
} from '../test_constants';
import { START_EMAIL_EDIT } from '../actions/email';
import { SHOW_DIALOG } from '../actions/ui';
import { EMAIL_COMPOSITION_DIALOG } from '../components/email/constants';

describe('LearnerSearchPage', function () {
  let renderComponent, listenForActions, helper, server;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    renderComponent = helper.renderComponent.bind(helper);
    listenForActions = helper.listenForActions.bind(helper);
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
      assert.deepEqual(body.filter.term['program.id'], PROGRAMS[0].id);
    });
  });

  it("doesn't filter by program id for current enrollment if it's not set to anything", () => {
    helper.programsGetStub.returns(Promise.resolve([]));

    return renderComponent('/learners').then(() => {
      assert.lengthOf(server.requests, 0);
    });
  });

  it('email learners link shows the email composition dialog', () => {
    const EMAIL_LINK_SELECTOR = '#email-selected';
    const EMAIL_DIALOG_ACTIONS = [
      START_EMAIL_EDIT,
      SHOW_DIALOG
    ];

    return renderComponent('/learners').then(([wrapper]) => {
      let emailLink = wrapper.find(EMAIL_LINK_SELECTOR).at(0);

      return listenForActions(EMAIL_DIALOG_ACTIONS, () => {
        emailLink.simulate('click');
      }).then((state) => {
        assert.isTrue(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG]);
      });
    });
  });

  it('sends a request to find users by name when text is entered into the search box', () => {
    return renderComponent('/learners').then(([wrapper]) => {
      return new Promise(resolve => {
        wrapper.find("SearchBox").find('input[type="text"]').props().onInput({
          target: {
            value: 'xyz'
          }
        });

        // wait 500 millis for the request to be made
        setTimeout(() => {
          resolve();
        }, 500);
      });
    }).then(() => {
      let request = server.requests[server.requests.length - 1];
      let body = JSON.parse(request.requestBody);
      let query = body.query.multi_match;
      assert.deepEqual(query, {
        fields: [
          'profile.first_name.folded',
          'profile.last_name.folded',
          'profile.preferred_name.folded',
        ],
        analyzer: 'folding',
        query: 'xyz',
        type: 'phrase_prefix',
      });
      assert.equal(window.location.toString(), "http://fake/?q=xyz");
    });
  });
});
