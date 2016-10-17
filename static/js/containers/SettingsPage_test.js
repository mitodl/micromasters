/* global SETTINGS: false */
import '../global_init';
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import {
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  CLEAR_PROFILE_EDIT,

  receiveGetUserProfileSuccess
} from '../actions/profile';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../lib/api';
import { USER_PROFILE_RESPONSE } from '../constants';

describe("SettingsPage", function() {
  this.timeout(5000);
  let nextButtonSelector = '.next';
  let listenForActions, renderComponent, helper, patchUserProfileStub;
  let userActions = [START_PROFILE_EDIT];

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);
    patchUserProfileStub = helper.sandbox.stub(api, 'patchUserProfile');

    helper.profileGetStub.
      withArgs(SETTINGS.username).
      returns(
        Promise.resolve(_.cloneDeep(USER_PROFILE_RESPONSE), {
          username: SETTINGS.username
        })
      );
  });

  afterEach(() => {
    helper.cleanup();
  });

  let confirmSaveButtonBehavior = (updatedProfile, pageElements, validationFailure=false) => {
    let { div, button } = pageElements;
    button = button || div.querySelector(nextButtonSelector);
    patchUserProfileStub.throws("Invalid arguments");
    patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(Promise.resolve(updatedProfile));

    let actions = [];
    if (!validationFailure) {
      actions.push(
        REQUEST_PATCH_USER_PROFILE,
        RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        START_PROFILE_EDIT,
        CLEAR_PROFILE_EDIT
      );
    }
    actions.push(
      UPDATE_PROFILE_VALIDATION
    );
    return listenForActions(actions, () => {
      TestUtils.Simulate.click(button);
    });
  };

  it('shows the privacy form', () => {
    return renderComponent("/settings", userActions).then(([, div]) => {
      let pageHeading = div.getElementsByClassName('privacy-form-heading')[0];
      assert.equal(pageHeading.textContent, 'Settings');

      let question = div.getElementsByClassName('privacy-form-heading')[1];
      assert.equal(question.textContent, 'Who can see your profile?');

      let emailPrefHeading = div.getElementsByClassName('privacy-form-heading')[2];
      assert.equal(emailPrefHeading.textContent, 'Email Preferences');
    });
  });

  describe('save privacy form', () => {
    it('save privacy changes', () => {
      return renderComponent("/settings", userActions).then(([, div]) => {
        let button = div.querySelector(nextButtonSelector);
        let receivedProfile = Object.assign(_.cloneDeep(USER_PROFILE_RESPONSE), {
          account_privacy: 'public',
          email_optin: true
        });
        helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, receivedProfile));

        assert(button.innerHTML.includes("Save"));
        let updatedProfile = Object.assign(_.cloneDeep(receivedProfile), {
          email_optin: true,
          filled_out: true
        });
        return confirmSaveButtonBehavior(updatedProfile, {button: button});
      });
    });
  });
});
