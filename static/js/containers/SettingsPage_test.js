/* global SETTINGS: false */
import '../global_init';
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';

import {
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  CLEAR_PROFILE_EDIT,

  receiveGetUserProfileSuccess
} from '../actions';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../util/api';
import { USER_PROFILE_RESPONSE } from '../constants';

describe("SettingsPage", function() {
  this.timeout(5000);
  let nextButtonSelector = '.progress-button.next';
  let listenForActions, renderComponent, helper, patchUserProfileStub;
  let userActions = [START_PROFILE_EDIT];

  describe ("Settings page tests", () => {
    beforeEach(() => {
      helper = new IntegrationTestHelper();
      listenForActions = helper.listenForActions.bind(helper);
      renderComponent = helper.renderComponent.bind(helper);
      patchUserProfileStub = helper.sandbox.stub(api, 'patchUserProfile');

      helper.profileGetStub.
        withArgs(SETTINGS.username).
        returns(
        Promise.resolve(Object.assign({}, USER_PROFILE_RESPONSE, {
          username: SETTINGS.username
        }))
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
        let question = div.getElementsByClassName('privacy-form-heading')[0];
        assert.equal(question.textContent, 'Who can see your profile?');
      });
    });

    describe('save privacy form', () => {
      it('save privacy changes', () => {
        return renderComponent("/settings", userActions).then(([, div]) => {
          let button = div.querySelector(nextButtonSelector);
          let receivedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
            account_privacy: 'public'
          });

          helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, receivedProfile));

          assert(button.innerHTML.includes("Save"));
          let updatedProfile = Object.assign({}, receivedProfile, {
            email_optin: true,
            filled_out: true
          });

          return confirmSaveButtonBehavior(updatedProfile, {button: button});
        });
      });
    });
  });
});