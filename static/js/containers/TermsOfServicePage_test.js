/* global SETTINGS: false */
import '../global_init';
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';

import {
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
} from '../actions';
import { USER_PROFILE_RESPONSE } from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../util/api';
import * as util from '../util/util';

describe("TermsOfService", () => {
  let listenForActions, renderComponent, helper;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);
  });

  afterEach(() => {
    helper.cleanup();
  });

  it("sees their username in the terms of service", () => {
    const username = 'fake_username';
    let getPreferredNameStub = helper.sandbox.stub(util, 'getPreferredName');
    getPreferredNameStub.returns("fake_username");
    return renderComponent("/terms_of_service").then(([, div]) => {
      assert(getPreferredNameStub.called, "getPreferredName wasn't called");

      assert(
        div.textContent.includes(`Welcome ${username}, let's complete your enrollment to MIT MicroMasters.`),
        "Couldn't find text"
      );
    });
  });

  it("requires terms of service if user hasn't already agreed to it", () => {
    let response = Object.assign({}, USER_PROFILE_RESPONSE, {
      agreed_to_terms_of_service: false
    });
    helper.profileGetStub.returns(Promise.resolve(response));

    return renderComponent("/dashboard").then(() => {
      assert.equal(helper.currentLocation.pathname, "/terms_of_service");
    });
  });

  it("requires terms of service if user hasn't already agreed to it even if profile is not complete", () => {
    let response = Object.assign({}, USER_PROFILE_RESPONSE, {
      agreed_to_terms_of_service: false,
      filled_out: false
    });
    helper.profileGetStub.returns(Promise.resolve(response));

    return renderComponent("/dashboard").then(() => {
      assert.equal(helper.currentLocation.pathname, "/terms_of_service");
    });
  });

  it("agrees to terms of service", () => {
    let profileActions = [
      REQUEST_PATCH_USER_PROFILE,
      RECEIVE_PATCH_USER_PROFILE_SUCCESS
    ];
    let response = Object.assign({}, USER_PROFILE_RESPONSE, {
      agreed_to_terms_of_service: false
    });
    helper.profileGetStub.returns(Promise.resolve(response));

    let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
      agreed_to_terms_of_service: true
    });
    let profilePatchStub = helper.sandbox.stub(api, 'patchUserProfile');
    profilePatchStub.throws("Invalid arguments");
    profilePatchStub.withArgs(SETTINGS.username, updatedProfile).returns(Promise.resolve(updatedProfile));

    return renderComponent("/terms_of_service").then(([component]) => {
      return listenForActions(profileActions, () => {
        let button = component.querySelector(".btn-success");

        TestUtils.Simulate.click(button);
      });
    });
  });

  it("clicks Cancel on terms of service page", () => {
    let response = Object.assign({}, USER_PROFILE_RESPONSE, {
      agreed_to_terms_of_service: false
    });
    helper.profileGetStub.returns(Promise.resolve(response));

    return renderComponent("/terms_of_service").then(([component]) => {
      let cancelLink = component.querySelector(".btn-danger");
      assert.equal(cancelLink.href, "/logout");
    });
  });
});
