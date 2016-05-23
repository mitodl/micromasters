/* global SETTINGS: false */
import '../global_init';
import TestUtils from 'react-addons-test-utils';
import assert from 'assert';

import {
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION
} from '../actions';
import { USER_PROFILE_RESPONSE } from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../util/api';

describe("ProfilePage", function() {
  let listenForActions, renderComponent, helper, patchUserProfileStub;
  beforeEach(() => {
    helper = new IntegrationTestHelper();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);

    patchUserProfileStub = helper.sandbox.stub(api, 'patchUserProfile');
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('marks email_optin and filled_out when saving this page', done => {
    renderComponent("/profile/privacy").then(([component, div]) => {  // eslint-disable-line no-unused-vars
      let button = div.querySelectorAll("button")[1];
      assert.equal(button.innerHTML, "Save and continue");

      let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        email_optin: true,
        filled_out: true
      });

      patchUserProfileStub.throws("Invalid arguments");
      patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(Promise.resolve(updatedProfile));

      listenForActions([
        REQUEST_PATCH_USER_PROFILE,
        RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        START_PROFILE_EDIT,
        UPDATE_PROFILE_VALIDATION
      ], () => {
        TestUtils.Simulate.click(button);
      }).then(() => {
        done();
      });
    });
  });

  for (let page of ['personal', 'education', 'professional']) {
    it(`marks filled_out = false when saving on /profile/${page}`, done => {
      helper.profileGetStub.returns(
        Promise.resolve(
          Object.assign({}, USER_PROFILE_RESPONSE, {
            filled_out: true
          })
        )
      );

      renderComponent(`/profile/${page}`).then(([component, div]) => {  // eslint-disable-line no-unused-vars
        let buttons = div.querySelectorAll("button");
        let button = Array.from(buttons).find(
          button => button.innerHTML.indexOf("Save") !== -1
        );

        let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          filled_out: false
        });

        patchUserProfileStub.throws("Invalid arguments");
        patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(Promise.resolve(updatedProfile));

        listenForActions([
          REQUEST_PATCH_USER_PROFILE,
          RECEIVE_PATCH_USER_PROFILE_SUCCESS,
          START_PROFILE_EDIT,
          UPDATE_PROFILE_VALIDATION
        ], () => {
          TestUtils.Simulate.click(button);
        }).then(() => {
          done();
        });
      });
    });
  }
});
