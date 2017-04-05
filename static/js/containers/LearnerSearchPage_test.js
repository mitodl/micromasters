/* global SETTINGS: false */
import { assert } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { Utils as SearchkitUtils } from 'searchkit';

import IntegrationTestHelper from '../util/integration_test_helper';
import {
  PROGRAMS,
  ELASTICSEARCH_RESPONSE,
} from '../test_constants';
import {
  INITIATE_SEND_EMAIL,
  START_EMAIL_EDIT,
  SEND_EMAIL_SUCCESS,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
  UPDATE_EMAIL_EDIT,
} from '../actions/email';
import {
  SHOW_DIALOG,
  HIDE_DIALOG,
} from '../actions/ui';
import { EMAIL_COMPOSITION_DIALOG } from '../components/email/constants';
import { modifyTextField } from '../util/test_utils';

describe('LearnerSearchPage', function () {
  let renderComponent, listenForActions, helper, mockAxios, replySpy;

  beforeEach(() => {
    // reset Searchkit's guid counter so that it matches our expected data for each test
    SearchkitUtils.guidCounter = 1;
    mockAxios = new MockAdapter(axios);

    helper = new IntegrationTestHelper();
    replySpy = helper.sandbox.stub().returns(Promise.resolve([200, _.cloneDeep(ELASTICSEARCH_RESPONSE)]));
    mockAxios.onPost('/_search').reply(replySpy);
    renderComponent = helper.renderComponent.bind(helper);
    listenForActions = helper.listenForActions.bind(helper);
  });

  afterEach(() => {
    helper.cleanup();
    mockAxios.restore();
  });

  const renderSearch = () => {
    return renderComponent('/learners').then(([wrapper]) => {
      return new Promise(resolve => {
        // wait 10 millis for the request to be made
        setTimeout(() => {
          resolve([wrapper]);
        }, 10);
      });
    });
  };

  it('calls the elasticsearch API', () => {
    assert.equal(replySpy.callCount, 0);
    return renderSearch().then(() => {
      assert.equal(replySpy.callCount, 1);

      const callArgs = replySpy.firstCall.args[0];
      assert.deepEqual(callArgs.url, "_search");
      assert.deepEqual(callArgs.method, "post");
    });
  });

  it('filters by program id for current enrollment', () => {
    return renderSearch().then(() => {
      assert.equal(replySpy.callCount, 1);

      const callArgs = replySpy.firstCall.args[0];
      const body = JSON.parse(callArgs.data);
      assert.deepEqual(body.post_filter.term['program.id'], PROGRAMS[0].id);
    });
  });

  it("doesn't filter by program id for current enrollment if it's not set to anything", () => {
    helper.programsGetStub.returns(Promise.resolve([]));

    return renderSearch().then(() => {
      assert.equal(replySpy.callCount, 0);
    });
  });

  it('should set sendAutomaticEmails flag', () => {
    const EMAIL_LINK_SELECTOR = '#email-selected';
    const EMAIL_DIALOG_ACTIONS = [
      START_EMAIL_EDIT,
      SHOW_DIALOG
    ];

    return renderSearch().then(([wrapper]) => {
      let emailLink = wrapper.find(EMAIL_LINK_SELECTOR).at(0);

      return listenForActions(EMAIL_DIALOG_ACTIONS, () => {
        emailLink.simulate('click');
      }).then((state) => {
        assert.isTrue(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG]);
        return listenForActions([UPDATE_EMAIL_EDIT], () => {
          document.querySelector('.create-campaign input').click();
        }).then((state) => {
          assert.isTrue(state.email[state.email.currentlyActive].inputs.sendAutomaticEmails);
        });
      });
    });
  });

  it('sends an email using the email link', () => {
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

        modifyTextField(document.querySelector('.email-subject'), 'subject');
        modifyTextField(document.querySelector('.email-body'), 'body');
        document.querySelector('.create-campaign input').click();

        return listenForActions([
          UPDATE_EMAIL_VALIDATION,
          INITIATE_SEND_EMAIL,
          SEND_EMAIL_SUCCESS,
          CLEAR_EMAIL_EDIT,
          HIDE_DIALOG,
        ], () => {
          document.querySelector('.email-composition-dialog .save-button').click();
        }).then(state => {
          assert.isFalse(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG]);
          assert.isTrue(helper.sendSearchResultMail.calledWith('subject', 'body', sinon.match.any, true));
          assert.deepEqual(
            Object.keys(helper.sendSearchResultMail.firstCall.args[2]),
            [
              'post_filter',
              'aggs',
              'size',
              'sort',
            ]
          );
        });
      });
    });
  });

  it('sends a request to find users by name when text is entered into the search box', () => {
    return renderSearch().then(([wrapper]) => {
      wrapper.find("SearchBox").find('input[type="text"]').props().onInput({
        target: {
          value: 'xyz'
        }
      });
    }).then(() => {
      // initial load, then update for value of xyz
      assert.equal(replySpy.callCount, 2);
      const callArgs = replySpy.secondCall.args[0];
      const body = JSON.parse(callArgs.data);
      const query = body.query.multi_match;
      assert.deepEqual(query, {
        fields: [
          'profile.first_name.folded',
          'profile.last_name.folded',
          'profile.preferred_name.folded',
          'profile.username.folded',
          'profile.full_name.folded',
          'email.folded'
        ],
        analyzer: 'folding',
        query: 'xyz',
        type: 'phrase_prefix',
      });
      assert.equal(window.location.toString(), "http://fake/?q=xyz");
    });
  });

  describe('work history facet', () => {
    it('has the expected aggregations', () => {
      return renderSearch().then(() => {
        assert.equal(replySpy.callCount, 1);
        const callArgs = replySpy.firstCall.args[0];
        const body = JSON.parse(callArgs.data);

        const keys = Object.keys(body.aggs);
        const degreeNameKeys = keys.filter(key => key.startsWith("profile.work_history.company_name"));

        // make sure the accessor is modifying an existing field and not adding a new one with a different name
        assert.lengthOf(degreeNameKeys, 1);
        const degreeNameKey = degreeNameKeys[0];

        assert.deepEqual(body.aggs[degreeNameKey], {
          "aggs": {
            "inner": {
              "aggs": {
                "profile.work_history.company_name": {
                  "aggs": {
                    "company_name_count": {
                      "aggs": {
                        "count": {
                          "cardinality": {
                            "field": "user_id"
                          }
                        }
                      },
                      "reverse_nested": {}
                    }
                  },
                  "terms": {
                    "field": "profile.work_history.company_name",
                    "order": {
                      "company_name_count": "desc"
                    },
                    "size": 20
                  }
                },
                "profile.work_history.company_name_count": {
                  "cardinality": {
                    "field": "profile.work_history.company_name"
                  }
                }
              },
              "nested": {
                "path": "profile.work_history"
              }
            }
          },
          "filter": {
            "term": {
              "program.id": PROGRAMS[0].id
            }
          }
        });
      });
    });

    it('displays the correct number in the UI', () => {
      return renderSearch().then(([wrapper]) => {
        const workHistoryItems = wrapper.find("ModifiedMultiSelect Select").props().options;
        assert.deepEqual(workHistoryItems, [{
          'label': 'Microsoft (1) ',
          'value': 'Microsoft'
        }]);
      });
    });
  });

  describe('education', () => {
    it('has the expected aggregations', () => {
      return renderSearch().then(() => {
        assert.equal(replySpy.callCount, 1);
        const callArgs = replySpy.firstCall.args[0];
        const body = JSON.parse(callArgs.data);

        const keys = Object.keys(body.aggs);
        const degreeNameKeys = keys.filter(key => key.startsWith("profile.education.degree_name"));

        // make sure the accessor is modifying an existing field and not adding a new one with a different name
        assert.lengthOf(degreeNameKeys, 1);
        const degreeNameKey = degreeNameKeys[0];

        assert.deepEqual(body.aggs[degreeNameKey], {
          "filter": {
            "term": {
              "program.id": 3
            }
          },
          "aggs": {
            "inner": {
              "nested": {
                "path": "profile.education"
              },
              "aggs": {
                "profile.education.degree_name": {
                  "terms": {
                    "field": "profile.education.degree_name",
                    "size": 50
                  },
                  "aggs": {
                    "school_name_count": {
                      "reverse_nested": {},
                      "aggs": {
                        "count": {
                          "cardinality": {
                            "field": "user_id"
                          }
                        }
                      }
                    }
                  }
                },
                "profile.education.degree_name_count": {
                  "cardinality": {
                    "field": "profile.education.degree_name"
                  }
                }
              }
            }
          },
        });
      });
    });

    it('displays the correct number in the UI', () => {
      return renderSearch().then(([wrapper]) => {
        let educationItems = wrapper.find('EducationFilter ItemList').props().items;

        assert.deepEqual(educationItems, [
          {doc_count: 1, key: 'b'},
          {doc_count: 1, key: 'hs'},
          {doc_count: 1, key: 'm'}
        ]);
      });
    });
  });
});
