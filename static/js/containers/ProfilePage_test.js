/* global SETTINGS: false */
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import {
  REQUEST_GET_USER_PROFILE,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  CLEAR_PROFILE_EDIT,

  receiveGetUserProfileSuccess,
} from '../actions';
import {
  SET_SHOW_WORK_DELETE_ALL_DIALOG,
  SET_EDUCATION_DEGREE_LEVEL,
  SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,
  SET_EDUCATION_DEGREE_INCLUSIONS,
  SET_WORK_HISTORY_EDIT,
  SET_TOS_DIALOG_VISIBILITY,

  setEducationDegreeInclusions,
  setWorkHistoryEdit,
  setProfileStep,
} from '../actions/ui';
import {
  USER_PROFILE_RESPONSE,
  EDUCATION_LEVELS,
  ASSOCIATE,
  DOCTORATE,
  HIGH_SCHOOL,
  BACHELORS,
  MASTERS,
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
  PRIVACY_STEP,
} from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../util/api';

describe("ProfilePage", function() {
  this.timeout(5000);  // eslint-disable-line no-invalid-this

  let listenForActions, renderComponent, helper, patchUserProfileStub;
  let profileSteps = [
    PERSONAL_STEP,
    EDUCATION_STEP,
    EMPLOYMENT_STEP,
    PRIVACY_STEP,
  ];
  let prevButtonSelector = '.mm-button.prev';
  let nextButtonSelector = '.mm-button.next';
  let noInclusions = {};
  for (const { value } of EDUCATION_LEVELS) {
    noInclusions[value] = false;
  }

  const setStep = step => helper.store.dispatch(setProfileStep(step));

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);
    patchUserProfileStub = helper.sandbox.stub(api, 'patchUserProfile');
  });

  afterEach(() => {
    helper.cleanup();
  });

  let confirmSaveButtonBehavior = (updatedProfile, pageElements, validationFailure=false, actions = []) => {
    let { div, button } = pageElements;
    button = button || div.querySelector(nextButtonSelector);
    patchUserProfileStub.throws("Invalid arguments");
    patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(Promise.resolve(updatedProfile));

    if ( actions.length === 0 ) {
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
    }

    return listenForActions(actions, () => {
      TestUtils.Simulate.click(button);
    });
  };

  let openDialog = () => {
    return [...document.getElementsByClassName('deletion-confirmation')].find(dialog => (
      dialog.style["left"] === "0px"
    ));
  };

  let radioToggles = (div, selector) => div.querySelector(selector).getElementsByTagName('input');

  describe('switch toggling behavior', () => {
    beforeEach(() => {
      helper.profileGetStub.
        withArgs(SETTINGS.username).
        returns(
          Promise.resolve(Object.assign({}, USER_PROFILE_RESPONSE, {
            username: SETTINGS.username
          }))
        );
    });

    it('should confirm and let you cancel when toggling the switch on work history', () => {
      setStep(EMPLOYMENT_STEP);
      return renderComponent('/profile').then(([, div]) => {
        let toggle = radioToggles(div, '.profile-radio-switch');

        return listenForActions([
          SET_SHOW_WORK_DELETE_ALL_DIALOG,
          SET_SHOW_WORK_DELETE_ALL_DIALOG,
        ], () => {
          TestUtils.Simulate.change(toggle[1]);
          let dialog = openDialog();
          let cancelButton = dialog.querySelector('.cancel-button');
          TestUtils.Simulate.click(cancelButton);
          let state = helper.store.getState();
          let profile = state.profiles.jane.profile;
          assert.equal(_.isEmpty(profile.work_history), false);
        });
      });
    });

    it('should confirm and let you delete when toggling the switch on work history', () => {
      setStep(EMPLOYMENT_STEP);
      return renderComponent('/profile').then(([, div]) => {
        let updateProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
        updateProfile.username = SETTINGS.username;
        updateProfile.work_history = [];

        patchUserProfileStub.throws("Invalid arguments");
        patchUserProfileStub.withArgs(SETTINGS.username, updateProfile).returns(
          Promise.resolve(updateProfile)
        );

        let toggle = radioToggles(div, '.profile-radio-switch');
        return listenForActions([
          SET_SHOW_WORK_DELETE_ALL_DIALOG,
          START_PROFILE_EDIT,
          UPDATE_PROFILE_VALIDATION,
          REQUEST_PATCH_USER_PROFILE,
          SET_WORK_HISTORY_EDIT,
          SET_SHOW_WORK_DELETE_ALL_DIALOG,
          RECEIVE_PATCH_USER_PROFILE_SUCCESS,
          CLEAR_PROFILE_EDIT,
        ], () => {
          TestUtils.Simulate.change(toggle[1]);
          let dialog = openDialog();
          let deleteButton = dialog.querySelector('.delete-button');
          TestUtils.Simulate.click(deleteButton);
        }).then(() => {
          let state = helper.store.getState();
          let workHistory = state.profiles.jane.profile.work_history;
          assert.deepEqual(workHistory, []);
        });
      });

    });

    it('shouldnt confirm when toggling the switch on work history if there are no entries', () => {
      setStep(EMPLOYMENT_STEP);
      return renderComponent('/profile').then(([, div]) => {
        let emptyWorkHistory = Object.assign({}, USER_PROFILE_RESPONSE, {
          work_history: []
        });
        helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, emptyWorkHistory));

        let toggle = radioToggles(div, '.profile-radio-switch');

        return listenForActions([
        ], () => {
          TestUtils.Simulate.change(toggle[0]);
          assert.equal(openDialog(), undefined);
          TestUtils.Simulate.change(toggle[1]);
          assert.equal(openDialog(), undefined);
        });
      });
    });


    let educationSwitchSelectors = EDUCATION_LEVELS.map(level => (
      { value: level.value, label: level.label, selector: `.profile-radio-switch.${level.value}` }
    ));

    let educationEntries = (level, profile) => (
      profile.education.filter(entry => entry.degree_name === level)
    );

    let fullEducation = () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      [
        DOCTORATE,
        ASSOCIATE,
        BACHELORS,
        MASTERS,
        DOCTORATE,
        MASTERS,
        HIGH_SCHOOL,
        ASSOCIATE,
      ].forEach((level, index) => clone.education.push({
        "id": index + 10,
        "degree_name": level,
        "graduation_date": "1975-12-01",
        "field_of_study": "Philosophy",
        "school_name": "Harvard",
        "school_city": "Cambridge",
        "school_state_or_territory": "US-MA",
        "school_country": "US",
        "online_degree": false
      }));
      clone.username = SETTINGS.username;
      return clone;
    };

    educationSwitchSelectors.forEach( ({label, value, selector}) => {
      it(`should confirm and let you cancel when toggling the ${label} switch on education`, () => {
        setStep(EDUCATION_STEP);
        return renderComponent('/profile').then(([, div]) => {
          helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, fullEducation()));

          let toggle = radioToggles(div, selector);
          return listenForActions([
            SET_EDUCATION_DEGREE_LEVEL,
            SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,
            SET_EDUCATION_DEGREE_LEVEL,
            SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,
          ], () => {
            TestUtils.Simulate.change(toggle[1]);
            let dialog = openDialog();
            let cancelButton = dialog.querySelector('.cancel-button');
            TestUtils.Simulate.click(cancelButton);
            let state = helper.store.getState();
            let profile = state.profiles.jane.profile;
            let entries = educationEntries(value, profile);
            assert.equal(_.isEmpty(entries), false);
          });
        });
      });
    });

    educationSwitchSelectors.forEach( ({label, value, selector}) => {
      it(`should confirm and let you delete when toggling the ${label} switch on education`, () => {
        setStep(EDUCATION_STEP);
        return renderComponent('/profile').then(([, div]) => {
          helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, fullEducation()));

          let updateProfile = fullEducation();
          updateProfile.education = updateProfile.education.filter(entry => entry.degree_name !== value);
          updateProfile.username = SETTINGS.username;

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.username, updateProfile).returns(
            Promise.resolve(updateProfile)
          );

          let toggle = radioToggles(div, selector);
          return listenForActions([
            SET_EDUCATION_DEGREE_LEVEL,
            SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,
            SET_EDUCATION_DEGREE_INCLUSIONS,
            START_PROFILE_EDIT,
            UPDATE_PROFILE_VALIDATION,
            REQUEST_PATCH_USER_PROFILE,
            SET_EDUCATION_DEGREE_LEVEL,
            SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,
            RECEIVE_PATCH_USER_PROFILE_SUCCESS,
            CLEAR_PROFILE_EDIT,
          ], () => {
            TestUtils.Simulate.change(toggle[1]);
            let dialog = openDialog();
            let deleteButton = dialog.querySelector('.delete-button');
            TestUtils.Simulate.click(deleteButton);
          }).then(() => {
            let state = helper.store.getState();
            let degreesIncluded = state.profiles.jane.profile.education.map(entry => (
              entry.degree_name
            ));
            assert.notInclude(degreesIncluded, value);
          });
        });
      });
    });

    educationSwitchSelectors.forEach( ({label, selector}) => {
      it(`shouldnt confirm when toggling the ${label} switch on education if there are no entries`, () => {
        setStep(EDUCATION_STEP);
        return renderComponent('/profile').then(([, div]) => {
          let noEducation = _.cloneDeep(USER_PROFILE_RESPONSE);
          noEducation.education = [];
          helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, noEducation));

          let toggle = radioToggles(div, selector);

          return listenForActions([
            SET_EDUCATION_DEGREE_INCLUSIONS,
            SET_EDUCATION_DEGREE_INCLUSIONS,
          ], () => {
            TestUtils.Simulate.change(toggle[1]);
            assert.equal(openDialog(), undefined);
            TestUtils.Simulate.change(toggle[0]);
            assert.equal(openDialog(), undefined);
          });
        });
      });
    });
  });

  it('navigates backward when Previous button is clicked', () => {
    setStep(EDUCATION_STEP);
    const checkStep = () => helper.store.getState().ui.profileStep;
    return renderComponent('/profile').then(([, div]) => {
      let button = div.querySelector(prevButtonSelector);
      assert.equal(checkStep(), EDUCATION_STEP);
      TestUtils.Simulate.click(button);
      assert.equal(checkStep(), PERSONAL_STEP);
    });
  });

  it(`marks email_optin and filled_out when saving on privacy`, () => {
    setStep(PRIVACY_STEP);
    return renderComponent('/profile').then(([, div]) => {
      // close all switches and remove all education so we don't get validation errors
      let receivedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        education: [],
        email_optin: true,
      });
      helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, receivedProfile));
      helper.store.dispatch(setEducationDegreeInclusions(noInclusions));

      let button = div.querySelector(nextButtonSelector);
      assert(button.innerHTML.includes("I'm Done!"));
      let updatedProfile = Object.assign({}, receivedProfile, {
        email_optin: true,
        filled_out: true
      });

      return confirmSaveButtonBehavior(updatedProfile, {button: button});
    });
  });

  it('does not validate education and employment switches when saving the privacy page', () => {
    setStep(PRIVACY_STEP);
    return renderComponent('/profile').then(([, div]) => {
      // close all switches and remove all education so we don't get validation errors
      let receivedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        education: [],
        work_history: [],
        email_optin: true,
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

      let actions = [
        START_PROFILE_EDIT,
        UPDATE_PROFILE_VALIDATION,
        REQUEST_PATCH_USER_PROFILE,
        RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        CLEAR_PROFILE_EDIT,
      ];

      return confirmSaveButtonBehavior(updatedProfile, {button: button}, true, actions).then(state => {
        assert.deepEqual(state.profiles[SETTINGS.username].profile.edit, undefined);
      });
    });
  });

  for (let step of profileSteps.slice(0,3)) {
    for (let filledOutValue of [true, false]) {
      it(`respects the current value (${filledOutValue}) when saving on ${step}`, () => {
        setStep(step);
        let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          filled_out: filledOutValue,
          education: []
        });
        helper.profileGetStub.returns(Promise.resolve(updatedProfile));
        return renderComponent('/profile').then(([, div]) => {
          // close all switches
          helper.store.dispatch(setEducationDegreeInclusions(noInclusions));
          return confirmSaveButtonBehavior(updatedProfile, {div: div});
        });
      });
    }
  }

  it('shows a spinner when profile get is processing', () => {
    return renderComponent('/profile').then(([, div]) => {
      assert.notOk(div.querySelector(".spinner"), "Found spinner but no fetch in progress");
      helper.store.dispatch({
        type: REQUEST_GET_USER_PROFILE,
        payload: {
          username: SETTINGS.username
        }
      });

      assert(div.querySelector(".spinner"), "Unable to find spinner");
    });
  });

  describe('terms of service', () => {
    beforeEach(() => {
      setStep(PERSONAL_STEP);

      helper.profileGetStub.
        withArgs(SETTINGS.username).
        returns(
          Promise.resolve(Object.assign({}, USER_PROFILE_RESPONSE, {
            username: SETTINGS.username,
            agreed_to_terms_of_service: false,
          }))
        );
    });

    it('should have a terms of service checkbox on the personal step', () => {
      return renderComponent('/profile').then(([, div]) => {
        assert.isNotNull(div.querySelector('.bound-check-box'));
      });
    });

    it('should provide a link to read the terms of service', () => {
      return renderComponent('/profile').then(([, div]) => {
        let link = div.querySelector('.bound-check-box a');

        return listenForActions([SET_TOS_DIALOG_VISIBILITY], () => {
          TestUtils.Simulate.click(link);
          let dialog = document.querySelector('.terms-of-service');
          assert.equal(dialog.querySelector('h3').textContent, "Terms of Service");
        });
      });
    });

    it('should show a validation error if you do not accept', () => {
      return renderComponent('/profile').then(([, div]) => {
        return listenForActions([
          START_PROFILE_EDIT,
          UPDATE_PROFILE_VALIDATION,
        ], () =>{
          let next = div.querySelector(nextButtonSelector);
          TestUtils.Simulate.click(next);
          assert.equal(
            div.querySelector('.bound-check-box .validation-error-text').textContent,
            "You must agree to the terms of service to continue"
          );
        });
      });
    });
  });
});
