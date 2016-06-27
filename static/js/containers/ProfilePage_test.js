/* global SETTINGS: false */
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import {
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

  setEducationDegreeInclusions,
  setWorkHistoryEdit,
} from '../actions/ui';
import {
  USER_PROFILE_RESPONSE,
  EDUCATION_LEVELS,
  ASSOCIATE,
  DOCTORATE,
  HIGH_SCHOOL,
  BACHELORS,
  MASTERS,
} from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../util/api';

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

  let openDialog = () => {
    return [...document.getElementsByClassName('deletion-confirmation')].find(dialog => (
      dialog.style["left"] === "0px"
    ));
  };

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
      return renderComponent(pageUrlStubs[2]).then(([, div]) => {
        let toggle = div.querySelector('#profile-tab-professional-switch');

        return listenForActions([
          SET_SHOW_WORK_DELETE_ALL_DIALOG,
          SET_SHOW_WORK_DELETE_ALL_DIALOG,
        ], () => {
          TestUtils.Simulate.change(toggle);
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
      return renderComponent(pageUrlStubs[2]).then(([, div]) => {
        let updateProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
        updateProfile.username = SETTINGS.username;
        updateProfile.work_history = [];

        patchUserProfileStub.throws("Invalid arguments");
        patchUserProfileStub.withArgs(SETTINGS.username, updateProfile).returns(
          Promise.resolve(updateProfile)
        );

        let toggle = div.querySelector('#profile-tab-professional-switch');
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
          TestUtils.Simulate.change(toggle);
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
      return renderComponent(pageUrlStubs[2]).then(([, div]) => {
        let emptyWorkHistory = Object.assign({}, USER_PROFILE_RESPONSE, {
          work_history: []
        });
        helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, emptyWorkHistory));

        let toggle = div.querySelector('#profile-tab-professional-switch');

        return listenForActions([
        ], () => {
          TestUtils.Simulate.change(toggle);
          assert.equal(openDialog(), undefined);
          TestUtils.Simulate.change(toggle);
          assert.equal(openDialog(), undefined);
        });
      });
    });


    let educationSwitchSelectors = EDUCATION_LEVELS.map(level => (
      { value: level.value, label: level.label, selector: `#profile-tab-education-switch-${level.value}` }
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
        return renderComponent(pageUrlStubs[1]).then(([, div]) => {
          helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, fullEducation()));

          let toggle = div.querySelector(selector);
          return listenForActions([
            SET_EDUCATION_DEGREE_LEVEL,
            SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,
            SET_EDUCATION_DEGREE_LEVEL,
            SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,
          ], () => {
            TestUtils.Simulate.change(toggle);
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
        return renderComponent(pageUrlStubs[1]).then(([, div]) => {
          helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, fullEducation()));

          let updateProfile = fullEducation();
          updateProfile.education = updateProfile.education.filter(entry => entry.degree_name !== value);
          updateProfile.username = SETTINGS.username;

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.username, updateProfile).returns(
            Promise.resolve(updateProfile)
          );

          let toggle = div.querySelector(selector);
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
            TestUtils.Simulate.change(toggle);
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
        return renderComponent(pageUrlStubs[1]).then(([, div]) => {
          let noEducation = _.cloneDeep(USER_PROFILE_RESPONSE);
          noEducation.education = [];
          helper.store.dispatch(receiveGetUserProfileSuccess(SETTINGS.username, noEducation));

          let toggle = div.querySelector(selector);
          return listenForActions([SET_EDUCATION_DEGREE_INCLUSIONS], () => {
            TestUtils.Simulate.change(toggle);
            assert.equal(openDialog(), undefined);
            TestUtils.Simulate.change(toggle);
            assert.equal(openDialog(), undefined);
          });
        });
      });
    });
  });

  it('should show the pretty-printed MM id', () => {
    return renderComponent(pageUrlStubs[0]).then(([, div]) => {
      let id = div.querySelector('.card-student-id');
      assert.equal(`ID: ${USER_PROFILE_RESPONSE.pretty_printed_student_id}`, id.textContent);
    });
  });

  it('navigates backward when Previous button is clicked', () => {
    let firstPage = pageUrlStubs[0];
    let secondPage = pageUrlStubs[1];
    return renderComponent(secondPage).then(([, div]) => {
      let button = div.querySelector(prevButtonSelector);
      assert.equal(helper.currentLocation.pathname, secondPage);
      TestUtils.Simulate.click(button);
      assert.equal(helper.currentLocation.pathname, firstPage);
    });
  });

  it(`marks email_optin and filled_out when saving ${lastPage}`, () => {
    return renderComponent(lastPage).then(([, div]) => {
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

      return confirmSaveButtonBehavior(updatedProfile, {button: button});
    });
  });

  it("validates education switches on the education page", () => {
    return renderComponent('/profile/education').then(([, div]) => {
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

      return confirmSaveButtonBehavior(updatedProfile, {button: button}, true).then(state => {
        assert.deepEqual(state.profiles[SETTINGS.username].edit.errors, {
          [`education_${HIGH_SCHOOL}_required`]:
            `High school is required if switch is on. Please add a degree or switch it off.`
        });
      });
    });
  });

  it(`validates employment switches when saving the employment page`, () => {
    return renderComponent('/profile/professional').then(([, div]) => {
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

      return confirmSaveButtonBehavior(updatedProfile, {button: button}, true).then(state => {
        assert.deepEqual(state.profiles[SETTINGS.username].edit.errors, {
          work_history_required: "Work history is required if switch is on. Please add work history or switch it off."
        });
      });
    });
  });

  it('does not validate education and employment switches when saving the privacy page', () => {
    return renderComponent(lastPage).then(([, div]) => {
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

      return confirmSaveButtonBehavior(updatedProfile, {button: button}, true).then(state => {
        assert.deepEqual(state.profiles[SETTINGS.username].edit.errors, {});
      });
    });
  });

  for (let pageUrlStub of pageUrlStubs.slice(0,3)) {
    for (let filledOutValue of [true, false]) {
      it(`respects the current value (${filledOutValue}) when saving on ${pageUrlStub}`, () => {
        let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          filled_out: filledOutValue,
          education: []
        });
        helper.profileGetStub.returns(Promise.resolve(updatedProfile));
        return renderComponent(pageUrlStub).then(([, div]) => {
          // close all switches
          helper.store.dispatch(setEducationDegreeInclusions(noInclusions));
          return confirmSaveButtonBehavior(updatedProfile, {div: div});
        });
      });
    }
  }
});
