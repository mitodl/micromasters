/* global SETTINGS: false */
import '../global_init';
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';
import moment from 'moment';
import sinon from 'sinon';

import {
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  REQUEST_GET_USER_PROFILE,
  START_PROFILE_EDIT,
  UPDATE_PROFILE,
  UPDATE_PROFILE_VALIDATION,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,

  startProfileEdit,
  updateProfile,
} from '../actions/profile';
import {
  SET_WORK_DIALOG_VISIBILITY,
  SET_WORK_DIALOG_INDEX,
  SET_EDUCATION_DEGREE_LEVEL,
  SET_EDUCATION_DIALOG_INDEX,
  SET_EDUCATION_DIALOG_VISIBILITY,
  SET_USER_PAGE_DIALOG_VISIBILITY,
  SET_DELETION_INDEX,
  SET_SHOW_WORK_DELETE_DIALOG,
  SET_SHOW_EDUCATION_DELETE_DIALOG,
} from '../actions/ui';
import { USER_PROFILE_RESPONSE, HIGH_SCHOOL, DOCTORATE } from '../constants';
import {
  generateNewEducation,
  generateNewWorkHistory,
  getPreferredName
} from '../util/util';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../lib/api';
import { workEntriesByDate, educationEntriesByDate } from '../util/sorting';
import { modifyTextField, activeDeleteDialog } from '../util/test_utils';
import ValidationAlert from '../components/ValidationAlert';

describe("UserPage", function() {
  this.timeout(5000);

  let listenForActions, renderComponent, helper, patchUserProfileStub;
  let userActions = [RECEIVE_GET_USER_PROFILE_SUCCESS, REQUEST_GET_USER_PROFILE];

  const confirmResumeOrder = (
    editButton,
    profileProperty,
    sortFunc,
    editActions,
    dialogIndexProperty
  ) => {
    let state = helper.store.getState();
    let sorted = sortFunc(state.profiles[SETTINGS.username].profile[profileProperty]);

    // sorted entries should not equal unsorted entries
    assert.notDeepEqual(
      state.profiles[SETTINGS.username].profile[profileProperty],
      sorted.map(([,entry]) => entry)
    );

    return listenForActions(editActions, () => {
      TestUtils.Simulate.click(editButton);
    }).then(() => {
      state = helper.store.getState();
      let stateIndex = state.ui[dialogIndexProperty];
      let [sortIndex, sortEntry] = sorted[0];
      // the dialog index dispatched to the store should be the same index
      // as the index (into the unsorted list) of the first element in our sorted list
      // since we clicked on the first entry in the UI
      assert.equal(stateIndex, sortIndex);
      // this index should not be equal to 0, since the first element in the sorted list
      // should not be the first item in the unsorted list
      assert.notEqual(stateIndex, 0);
      // the entry the index in the state points to should be the same element
      // in the unsorted array that we have in the sorted array
      let entries = state.profiles[SETTINGS.username].profile[profileProperty];
      assert.deepEqual(sortEntry, entries[stateIndex]);
    });
  };

  describe("Authenticated user page", () => {
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


    it('should have a logout link', () => {
      return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
        let logout = [...div.getElementsByTagName('a')].find(link => link.textContent === 'Logout');
        assert.ok(logout);
      });
    });

    describe("validation", () => {
      const inputs = dialog => [...dialog.getElementsByTagName('input')];
      const getEditPersonalButton = div => div.querySelector('.edit-profile-holder .mdl-button');
      const getDialog = () => document.querySelector('.personal-dialog');
      const getSave = () => getDialog().querySelector('.save-button');

      beforeEach(() => {
        HTMLDivElement.prototype.scrollIntoView = sinon.stub();
      });

      let userProfileActions = [
        SET_USER_PAGE_DIALOG_VISIBILITY,
        START_PROFILE_EDIT,
        UPDATE_PROFILE,
        UPDATE_PROFILE_VALIDATION,
        UPDATE_PROFILE,
        UPDATE_PROFILE_VALIDATION,
      ];

      let scrollActions = [
        SET_USER_PAGE_DIALOG_VISIBILITY,
        START_PROFILE_EDIT,
        UPDATE_PROFILE,
        UPDATE_PROFILE_VALIDATION,
      ];


      const clearValidation = (actions, getInput, validationExpectation, removeErrorValue) => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          return listenForActions(actions, () => {
            TestUtils.Simulate.click(getEditPersonalButton(div));

            let input;
            // run the 'getInput' function if 'removeErrorValue' is also a function (radio buttons)
            if ( _.isFunction(removeErrorValue) ) {
              getInput(getDialog());
            } else {
              input = getInput(getDialog());
              modifyTextField(input, "");
            }

            // check that validation error has propagated
            TestUtils.Simulate.click(getSave());
            let state = helper.store.getState();
            assert.deepEqual(state.profiles.jane.edit.errors, validationExpectation);
            let validationInfoText = document.querySelector('.validation-alert').
              querySelector('.message').textContent;
            assert.equal(validationInfoText, ValidationAlert.message);

            // run the 'remove error' function if it's a function
            if ( _.isFunction(removeErrorValue) ) {
              removeErrorValue(getDialog());
            } else {
              modifyTextField(input, removeErrorValue);
            }

          }).then(() => {
            let state = helper.store.getState();
            assert.deepEqual(state.profiles.jane.edit.errors, {});
          });
        });
      };

      const scrollIntoView = (actions, getInput) => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          return listenForActions(scrollActions, () => {
            TestUtils.Simulate.click(getEditPersonalButton(div));
            let input = getInput(getDialog());
            modifyTextField(input, "");
            TestUtils.Simulate.click(getSave());
          }).then(() => {
            return new Promise(resolve => {
              setTimeout(() => { // ensure that the DOM update after clicking 'save' has finished
                assert(HTMLDivElement.prototype.scrollIntoView.called, "Not called yet");
                resolve();
              }, 100);
            });
          });
        });
      };

      [clearValidation, scrollIntoView].forEach(testFunc => {
        it(`should ${testFunc.name} when filling out a required text field`, () => {
          const preferredName = dialog => inputs(dialog).find(i => i.name === "Preferred name");

          return testFunc(
            userProfileActions,
            preferredName,
            { preferred_name: 'Preferred name is required' },
            USER_PROFILE_RESPONSE.preferred_name
          );
        });

        it(`should ${testFunc.name} when filling out a required select field`, () => {
          const languageField = dialog => inputs(dialog).find(i => i.id.includes('Preferredlanguage'));

          return testFunc(
            userProfileActions.concat(UPDATE_PROFILE, UPDATE_PROFILE_VALIDATION),
            languageField,
            { preferred_language: "Preferred language is required" },
            USER_PROFILE_RESPONSE.preferred_language
          );
        });

        it(`should ${testFunc.name} when filling out a required date field`, () => {
          const dobMonth = dialog => inputs(dialog).find(i => i.id.includes('Dateofbirth'));

          return testFunc(
            userProfileActions,
            dobMonth,
            { date_of_birth: "Please enter a valid date of birth" },
            String(moment(USER_PROFILE_RESPONSE.date_of_birth).month())
          );
        });
      });

      it(`should clearValidationErrors when filling out a required radio field`, () => {
        const createValidationError = () => {
          helper.store.dispatch(startProfileEdit(SETTINGS.username));
          let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
          profile.gender = undefined;
          helper.store.dispatch(updateProfile(SETTINGS.username, profile));
        };

        const removeErrorValue = dialog => {
          let genderField = inputs(dialog).find(i => i.name === "Gender");
          genderField.click();
        };

        return clearValidation(
          userProfileActions,
          createValidationError,
          { gender: "Gender is required" },
          removeErrorValue,
        );
      });

      it(`should scrollIntoView when filling out a required radio field`, () => {
        const genderField = dialog => inputs(dialog).find(i => i.name === "Gender");
        const removeErrorValue = dialog => TestUtils.Simulate.click(genderField(dialog));

        return scrollIntoView(
          userProfileActions,
          genderField,
          { gender: "Gender is required" },
          removeErrorValue,
        );
      });
    });


    describe("Education History", () => {
      let userProfile;
      let deleteButton = div => {
        return div.getElementsByClassName('profile-form')[1].
          getElementsByClassName('delete-button')[0];
      };

      beforeEach(() => {
        userProfile = Object.assign(_.cloneDeep(USER_PROFILE_RESPONSE), {
          username: SETTINGS.username
        });
        userProfile.education.push({
          "id": 3,
          "degree_name": DOCTORATE,
          "graduation_date": "2015-12-01",
          "field_of_study": "Philosophy",
          "school_name": "Harvard",
          "school_city": "Cambridge",
          "school_state_or_territory": "US-MA",
          "school_country": "US",
          "online_degree": false
        });
        helper.profileGetStub.
          withArgs(SETTINGS.username).
          returns(Promise.resolve(userProfile));
      });

      it('shows the education component', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let title = div.getElementsByClassName('profile-card-header')[0];
          assert.equal(title.textContent, 'Education');
        });
      });

      it('should show the entries in resume order', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let editButton = div.querySelector('#education-card').
            querySelector('.edit-button');

          return confirmResumeOrder(
            editButton,
            'education',
            educationEntriesByDate,
            [
              SET_EDUCATION_DIALOG_INDEX,
              SET_EDUCATION_DIALOG_VISIBILITY,
              SET_EDUCATION_DEGREE_LEVEL,
            ],
            'educationDialogIndex'
          );
        });
      });

      it('should confirm deletion and let you cancel', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let button = deleteButton(div);

          return listenForActions([
            SET_DELETION_INDEX,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_DELETION_INDEX
          ], () => {
            TestUtils.Simulate.click(button);
            let dialog = activeDeleteDialog();
            let cancelButton = dialog.getElementsByClassName('cancel-button')[0];
            TestUtils.Simulate.click(cancelButton);
          });
        });
      });

      it('should confirm deletion and let you continue', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let expectedProfile = _.cloneDeep(userProfile);
          let sortedEducationEntries = educationEntriesByDate(expectedProfile.education);
          let indexOfFirstEntry = sortedEducationEntries[0][0];
          expectedProfile.education.splice(indexOfFirstEntry,1);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.
            withArgs(expectedProfile.username, expectedProfile).
            returns(Promise.resolve(expectedProfile));

          let firstEducationDeleteButton = deleteButton(div);

          return listenForActions([
            SET_DELETION_INDEX,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            START_PROFILE_EDIT,
            UPDATE_PROFILE_VALIDATION,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_DELETION_INDEX,
            REQUEST_PATCH_USER_PROFILE,
            RECEIVE_PATCH_USER_PROFILE_SUCCESS,
          ], () => {
            TestUtils.Simulate.click(firstEducationDeleteButton);
            let dialog = activeDeleteDialog();
            let confirmButton = dialog.getElementsByClassName('delete-button')[0];
            TestUtils.Simulate.click(confirmButton);
          });
        });
      });

      it('should let you edit an education entry', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {

          let editButton = div.getElementsByClassName('profile-form')[1].
            getElementsByClassName('profile-row-icons')[0].
            getElementsByClassName('mdl-button')[0];

          return listenForActions([
            SET_EDUCATION_DIALOG_INDEX,
            SET_EDUCATION_DIALOG_VISIBILITY,
            SET_EDUCATION_DEGREE_LEVEL,
          ], () => {
            TestUtils.Simulate.click(editButton);
          });
        });
      });

      it('should let you add an education entry', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let addButton = div.getElementsByClassName('profile-form')[1].
            querySelector('.mm-minor-action');

          let expectedProfile = _.cloneDeep(userProfile);
          let entry = Object.assign({}, generateNewEducation(HIGH_SCHOOL), {
            graduation_date: "1999-12-01",
            graduation_date_edit: {
              year: '1999',
              month: '12',
              day: undefined
            },
            degree_name_edit: undefined,
            school_name: "A School",
            school_country: "AF",
            school_country_edit: undefined,
            school_state_or_territory: "AF-BAL",
            school_state_or_territory_edit: undefined,
            school_city: "FoobarVille"
          });
          expectedProfile.education.push(entry);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.
            withArgs(expectedProfile.username, expectedProfile).
            returns(Promise.resolve(expectedProfile));

          let expectedActions = [
            START_PROFILE_EDIT,
            SET_EDUCATION_DIALOG_INDEX,
            SET_EDUCATION_DIALOG_VISIBILITY,
            SET_EDUCATION_DEGREE_LEVEL,
            UPDATE_PROFILE_VALIDATION,
            REQUEST_PATCH_USER_PROFILE,
            RECEIVE_PATCH_USER_PROFILE_SUCCESS
          ];
          for (let i = 0; i < 12; i++) {
            expectedActions.push(UPDATE_PROFILE);
          }
          return listenForActions(expectedActions, () => {
            TestUtils.Simulate.click(addButton);

            let dialog = document.querySelector('.education-dialog');
            let grid = dialog.getElementsByClassName('profile-tab-grid')[0];
            let inputs = grid.getElementsByTagName('input');

            // set the degree type
            modifyTextField(inputs[0], "High School");

            // fill out graduation date, school name
            modifyTextField(inputs[1], "A School");
            modifyTextField(inputs[2], "12");
            modifyTextField(inputs[3], "1999");

            // set country, state, and city
            modifyTextField(inputs[4], "Afghanistan");
            modifyTextField(inputs[5], "Balkh");
            modifyTextField(inputs[6], "FoobarVille");
            let save = dialog.querySelector('.save-button');
            TestUtils.Simulate.click(save);
          });
        });
      });
    });

    describe("Employment History", () => {
      let deleteButton = div => {
        return div.getElementsByClassName('profile-form')[2].
          getElementsByClassName('profile-row-icons')[0].
          getElementsByClassName('mdl-button')[1];
      };

      it('shows the employment history component', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([wrapper, ]) => {
          let headerText = wrapper.find('#work-history-card').find('.profile-card-header').text();
          assert.equal(headerText, 'Employment');
        });
      });

      it('should show the entries in resume order', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let editButton = div.getElementsByClassName('profile-form')[2].
            getElementsByClassName('profile-row-icons')[0].
            getElementsByClassName('mdl-button')[0];

          return confirmResumeOrder(
            editButton,
            'work_history',
            workEntriesByDate,
            [
              SET_WORK_DIALOG_INDEX,
              SET_WORK_DIALOG_VISIBILITY
            ],
            'workDialogIndex'
          );
        });
      });

      it('should confirm deletion and let you cancel', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let button = deleteButton(div);

          return listenForActions([
            SET_DELETION_INDEX,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_DELETION_INDEX,
          ], () => {
            TestUtils.Simulate.click(button);
            let dialog = activeDeleteDialog();
            let cancelButton = dialog.getElementsByClassName('cancel-button')[0];
            TestUtils.Simulate.click(cancelButton);
          });
        });
      });

      it('should confirm deletion and let you continue', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let updatedProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
          updatedProfile.username = SETTINGS.username;
          updatedProfile.work_history.splice(0,1);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(
            Promise.resolve(updatedProfile)
          );

          let deleteButton = div.getElementsByClassName('profile-form')[2].
            getElementsByClassName('profile-row-icons')[0].
            getElementsByClassName('mdl-button')[1];

          return listenForActions([
            SET_DELETION_INDEX,
            SET_SHOW_WORK_DELETE_DIALOG,
            START_PROFILE_EDIT,
            UPDATE_PROFILE_VALIDATION,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_DELETION_INDEX,
            REQUEST_PATCH_USER_PROFILE,
            RECEIVE_PATCH_USER_PROFILE_SUCCESS,
          ], () => {
            TestUtils.Simulate.click(deleteButton);
            let dialog = activeDeleteDialog();
            let button = dialog.getElementsByClassName('delete-button')[0];
            TestUtils.Simulate.click(button);
          });
        });
      });

      it('should let you edit a work history entry', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {

          let editButton = div.getElementsByClassName('profile-form')[2].
            getElementsByClassName('profile-row-icons')[0].
            getElementsByClassName('mdl-button')[0];

          return listenForActions([
            SET_WORK_DIALOG_INDEX,
            SET_WORK_DIALOG_VISIBILITY
          ], () => {
            TestUtils.Simulate.click(editButton);
          });
        });
      });

      it('should let you add a work history entry', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let addButton = div.getElementsByClassName('profile-form')[2].querySelector('.mm-minor-action');

          let updatedProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
          updatedProfile.username = SETTINGS.username;
          let entry = Object.assign({}, generateNewWorkHistory(), {
            position: "Assistant Foobar",
            industry: "Accounting",
            industry_edit: undefined,
            company_name: "FoobarCorp",
            start_date: "2001-12-01",
            start_date_edit: {
              year: "2001",
              month: "12",
              day: undefined
            },
            end_date: "2002-01-01",
            end_date_edit: {
              year: "2002",
              month: "1",
              day: undefined
            },
            city: "FoobarVille",
            country: "AF",
            country_edit: undefined,
            state_or_territory: "AF-BAL",
            state_or_territory_edit: undefined,
          });
          updatedProfile.work_history.push(entry);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(
            Promise.resolve(updatedProfile)
          );

          let expectedActions = [
            START_PROFILE_EDIT,
            UPDATE_PROFILE,
            SET_WORK_DIALOG_INDEX,
            SET_WORK_DIALOG_VISIBILITY,
            UPDATE_PROFILE_VALIDATION,
            REQUEST_PATCH_USER_PROFILE,
            RECEIVE_PATCH_USER_PROFILE_SUCCESS
          ];
          for (let i = 0; i < 14; i++) {
            expectedActions.push(UPDATE_PROFILE);
          }

          return listenForActions(expectedActions, () => {
            TestUtils.Simulate.click(addButton);
            let dialog = document.querySelector('.employment-dialog');
            let grid = dialog.querySelector('.profile-tab-grid');
            let inputs = grid.getElementsByTagName('input');

            // company name
            modifyTextField(inputs[0], "FoobarCorp");

            // country, state, city
            modifyTextField(inputs[1], "Afghanistan");
            modifyTextField(inputs[2], "Balkh");
            modifyTextField(inputs[3], "FoobarVille");

            // industry
            modifyTextField(inputs[4], "Accounting");

            // position
            modifyTextField(inputs[5], "Assistant Foobar");

            // start date, end date
            modifyTextField(inputs[6], "12");
            modifyTextField(inputs[7], "2001");
            modifyTextField(inputs[8], "01");
            modifyTextField(inputs[9], "2002");

            let button = dialog.querySelector(".save-button");
            TestUtils.Simulate.click(button);
          });
        });
      });
    });

    describe('Personal Info', () => {
      it('should show name and location', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let name = div.getElementsByClassName('profile-title')[0].textContent;
          assert.deepEqual(name, getPreferredName(USER_PROFILE_RESPONSE));
        });
      });

      it('should let you edit personal info', () => {
        return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
          let personalButton = div.querySelector('.edit-profile-holder').
            getElementsByClassName('mdl-button')[0];

          return listenForActions([SET_USER_PAGE_DIALOG_VISIBILITY], () => {
            TestUtils.Simulate.click(personalButton);
          });
        });
      });
    });

    it("should show all edit, delete icons for an authenticated user's own page" , () => {
      return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
        let count = div.getElementsByClassName('mdl-button--icon').length;
        assert.equal(count,
          1 + USER_PROFILE_RESPONSE.work_history.length * 2 + USER_PROFILE_RESPONSE.education.length * 2
        );
      });
    });

    it("should not show any edit, delete icons for other user pages" , () => {
      let otherProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        username: 'other'
      });
      helper.profileGetStub.withArgs('other').returns(Promise.resolve(otherProfile));
      return renderComponent(`/learner/other`, userActions).then(([, div]) => {
        let count = div.getElementsByClassName('mdl-button--icon').length;
        assert.equal(count, 0);
      });
    });
  });

  describe("Unauthenticated user page", () => {
    let settingsBackup;

    beforeEach(() => {
      helper = new IntegrationTestHelper();
      listenForActions = helper.listenForActions.bind(helper);
      renderComponent = helper.renderComponent.bind(helper);
      helper.profileGetStub.
        withArgs(SETTINGS.username).
        returns(Promise.resolve(USER_PROFILE_RESPONSE));
      settingsBackup = SETTINGS;
      SETTINGS = Object.assign({}, SETTINGS, {
        authenticated: false,
        username: null,
        name: ""
      });
    });

    afterEach(() => {
      helper.cleanup();
      SETTINGS = settingsBackup;
    });

    it('should hide all edit, delete icons', () => {
      return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
        assert.equal(0, div.getElementsByClassName('mdl-button--icon').length);
      });
    });

    it('should show sign in button with valid link', () => {
      return renderComponent(`/learner/${SETTINGS.username}`, userActions).then(([, div]) => {
        let button = div.querySelector("a[href='/login/edxorg/']");
        assert.equal(button.textContent.trim(), "Sign in with edX.org");
      });
    });
  });
});
