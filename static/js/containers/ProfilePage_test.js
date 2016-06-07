/* global SETTINGS: false */
import TestUtils from 'react-addons-test-utils';
import assert from 'assert';

import {
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,

  receiveGetUserProfileSuccess,
} from '../actions';
import {
  setEducationDegreeInclusions,
  setWorkHistoryEdit,
} from '../actions/ui';
import { USER_PROFILE_RESPONSE, EDUCATION_LEVELS } from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../util/api';
import { HIGH_SCHOOL } from '../constants';

describe("ProfilePage", function() {
  this.timeout(5000);  // eslint-disable-line no-invalid-this

  let listenForActions, renderComponent, helper, patchUserProfileStub;
  let pageUrlStubs = [
    '/profile/personal',
    '/profile/education',
    '/profile/professional',
    '/profile/privacy'
  ];
  let lastPage = pageUrlStubs[pageUrlStubs.length - 1];
  let prevButtonSelector = '.progress-button.previous';
  let nextButtonSelector = '.progress-button.next';
  let noInclusions = {};
  for (const { value } of EDUCATION_LEVELS) {
    noInclusions[value] = false;
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);
    patchUserProfileStub = helper.sandbox.stub(api, 'patchUserProfile');
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
      );
    }
    actions.push(
      START_PROFILE_EDIT,
      UPDATE_PROFILE_VALIDATION
    );
    return listenForActions(actions, () => {
      TestUtils.Simulate.click(button);
    });
  };

  it('navigates backward when Previous button is clicked', () => {
    let firstPage = pageUrlStubs[0];
    let secondPage = pageUrlStubs[1];
    renderComponent(secondPage).then(([, div]) => {
      let button = div.querySelector(prevButtonSelector);
      assert.equal(helper.currentLocation.pathname, secondPage);
      TestUtils.Simulate.click(button);
      assert.equal(helper.currentLocation.pathname, firstPage);
    });
  });

  it(`marks email_optin and filled_out when saving ${lastPage}`, done => {
    renderComponent(lastPage).then(([, div]) => {
      // close all switches and remove all education so we don't get validation errors
      let receivedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        education: []
      });
      helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, receivedProfile));
      helper.store.dispatch(setEducationDegreeInclusions(noInclusions));

      let button = div.querySelector(nextButtonSelector);
      assert(button.innerHTML.includes("I'm Done!"));
      let updatedProfile = Object.assign({}, receivedProfile, {
        email_optin: true,
        filled_out: true
      });

      confirmSaveButtonBehavior(updatedProfile, {button: button}).then(() => {
        done();
      });
    });
  });

  it("validates education switches on the education page", done => {
    renderComponent('/profile/education').then(([, div]) => {
      // close all switches and remove all education so we don't get validation errors
      let receivedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        education: []
      });
      helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, receivedProfile));
      helper.store.dispatch(setEducationDegreeInclusions(
        Object.assign({}, noInclusions, {
          [HIGH_SCHOOL]: true
        })
      ));
      helper.store.dispatch(setWorkHistoryEdit(true));

      let button = div.querySelector(nextButtonSelector);
      assert(button.innerHTML.includes("Save and Continue"));
      let updatedProfile = Object.assign({}, receivedProfile, {
        email_optin: true,
        filled_out: true
      });

      confirmSaveButtonBehavior(updatedProfile, {button: button}, true).then(state => {
        assert.deepEqual(state.profiles[SETTINGS.username].edit.errors, {
          [`education_${HIGH_SCHOOL}_required`]: `High school is required if switch is set`
        });
        done();
      });
    });
  });

  it(`validates employment switches when saving the employment page`, done => {
    renderComponent('/profile/professional').then(([, div]) => {
      // close all switches and remove all education so we don't get validation errors
      let receivedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        work_history: []
      });
      helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, receivedProfile));
      helper.store.dispatch(setWorkHistoryEdit(true));

      let button = div.querySelector(nextButtonSelector);
      assert(button.innerHTML.includes("Save and Continue"));
      let updatedProfile = Object.assign({}, receivedProfile, {
        email_optin: true,
        filled_out: true
      });

      confirmSaveButtonBehavior(updatedProfile, {button: button}, true).then(state => {
        assert.deepEqual(state.profiles[SETTINGS.username].edit.errors, {
          work_history_required: "Work history is required if switch is set"
        });
        done();
      });
    });
  });

  it(`validates education and employment switches when saving the ${lastPage}`, done => {
    renderComponent(lastPage).then(([, div]) => {
      // close all switches and remove all education so we don't get validation errors
      let receivedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        education: [],
        work_history: []
      });
      helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, receivedProfile));
      helper.store.dispatch(setEducationDegreeInclusions({
        [HIGH_SCHOOL]: true
      }));
      helper.store.dispatch(setWorkHistoryEdit(true));

      let button = div.querySelector(nextButtonSelector);
      assert(button.innerHTML.includes("I'm Done!"));
      let updatedProfile = Object.assign({}, receivedProfile, {
        email_optin: true,
        filled_out: true
      });

      confirmSaveButtonBehavior(updatedProfile, {button: button}, true).then(state => {
        assert.deepEqual(state.profiles[SETTINGS.username].edit.errors, {
          [`education_${HIGH_SCHOOL}_required`]: `High school is required if switch is set`,
          work_history_required: "Work history is required if switch is set"
        });
        done();
      });
    });
  });

  for (let pageUrlStub of pageUrlStubs.slice(0,3)) {
    for (let filledOutValue of [true, false]) {
      it(`respects the current value (${filledOutValue}) when saving on ${pageUrlStub}`, done => {
        let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          filled_out: filledOutValue,
          education: []
        });
        helper.profileGetStub.returns(Promise.resolve(updatedProfile));
        renderComponent(pageUrlStub).then(([, div]) => {
          // close all switches
          helper.store.dispatch(setEducationDegreeInclusions(noInclusions));
          confirmSaveButtonBehavior(updatedProfile, {div: div}).then(() => {
            done();
          });
        });
      });
    }
  }
});
