/* global SETTINGS: false */
import '../global_init';
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';
import moment from 'moment';
import sinon from 'sinon';

import * as inputUtil from '../components/inputs/util';
import {
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  REQUEST_GET_USER_PROFILE,
  START_PROFILE_EDIT,
  UPDATE_PROFILE,
  UPDATE_PROFILE_VALIDATION,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  UPDATE_VALIDATION_VISIBILITY,
  CLEAR_PROFILE_EDIT,

  requestPatchUserProfile,
  startProfileEdit,
  updateProfile,
} from '../actions/profile';
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
} from '../actions/programs';
import {
  setShowWorkDeleteDialog,
  setShowEducationDeleteDialog,
  SET_WORK_DIALOG_VISIBILITY,
  SET_WORK_DIALOG_INDEX,
  SET_EDUCATION_DEGREE_LEVEL,
  SET_EDUCATION_DIALOG_INDEX,
  SET_EDUCATION_DIALOG_VISIBILITY,
  SET_LEARNER_PAGE_DIALOG_VISIBILITY,
  SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY,

  SET_DELETION_INDEX,
  SET_SHOW_WORK_DELETE_DIALOG,
  SET_SHOW_EDUCATION_DELETE_DIALOG,
} from '../actions/ui';
import { USER_PROFILE_RESPONSE } from '../test_constants';
import { HIGH_SCHOOL, DOCTORATE } from '../constants';
import {
  generateNewEducation,
  generateNewWorkHistory,
  getPreferredName
} from '../util/util';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../lib/api';
import { workEntriesByDate, educationEntriesByDate } from '../util/sorting';
import {
  modifyTextArea,
  modifyTextField,
  activeDeleteDialog,
  modifySelectField,
  clearSelectField,
  GoogleMapsStub,
} from '../util/test_utils';

describe("LearnerPage", function() {
  this.timeout(10000);

  let listenForActions, renderComponent, helper, gmaps, patchUserProfileStub;
  let userActions = [
    REQUEST_GET_PROGRAM_ENROLLMENTS,
    RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
    REQUEST_GET_USER_PROFILE,
    RECEIVE_GET_USER_PROFILE_SUCCESS,
    REQUEST_GET_USER_PROFILE,
    RECEIVE_GET_USER_PROFILE_SUCCESS,
  ];

  const confirmResumeOrder = (
    editButton,
    profileProperty,
    sortFunc,
    editActions,
    dialogIndexProperty
  ) => {
    let state = helper.store.getState();
    let sorted = sortFunc(state.profiles[SETTINGS.user.username].profile[profileProperty]);

    // sorted entries should not equal unsorted entries
    assert.notDeepEqual(
      state.profiles[SETTINGS.user.username].profile[profileProperty],
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
      let entries = state.profiles[SETTINGS.user.username].profile[profileProperty];
      assert.deepEqual(sortEntry, entries[stateIndex]);
    });
  };

  describe("Authenticated user page", () => {
    beforeEach(() => {
      gmaps = new GoogleMapsStub();
      helper = new IntegrationTestHelper();
      listenForActions = helper.listenForActions.bind(helper);
      renderComponent = helper.renderComponent.bind(helper);

      patchUserProfileStub = helper.sandbox.stub(api, 'patchUserProfile');

      helper.profileGetStub.
        withArgs(SETTINGS.user.username).
        returns(Promise.resolve(USER_PROFILE_RESPONSE));
    });

    afterEach(() => {
      helper.cleanup();
      gmaps.cleanup();
    });


    it('should have a logout link', () => {
      const username = SETTINGS.user.username;
      return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
        let logout = [...div.getElementsByTagName('a')].find(link => link.textContent === 'Logout');
        assert.ok(logout);
      });
    });

    describe("validation", () => {
      const inputs = dialog => [...dialog.getElementsByTagName('input')];
      const getEditPersonalButton = div => div.querySelector('.edit-profile-holder .mdl-button');
      const getDialog = () => document.querySelector('.personal-dialog');
      const getSave = () => getDialog().querySelector('.save-button');

      let scrollActions = [
        SET_LEARNER_PAGE_DIALOG_VISIBILITY,
        START_PROFILE_EDIT,
        UPDATE_PROFILE,
        UPDATE_PROFILE_VALIDATION,
      ];

      let userProfileActions = scrollActions.concat([
        UPDATE_PROFILE,
        UPDATE_PROFILE_VALIDATION,
      ]);

      const clearValidation = (actions, getInput, validationExpectation, removeErrorValue) => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          return listenForActions(actions, () => {
            TestUtils.Simulate.click(getEditPersonalButton(div));

            let input;
            // run the 'getInput' function if 'removeErrorValue' is also a function (radio buttons)
            if (_.isFunction(removeErrorValue)) {
              getInput(getDialog());
            } else {
              input = getInput(getDialog());
              modifyTextField(input, "");
            }

            // check that validation error has propagated
            TestUtils.Simulate.click(getSave());
            let state = helper.store.getState();
            assert.deepEqual(state.profiles.jane.edit.errors, validationExpectation);

            // run the 'remove error' function if it's a function
            if (_.isFunction(removeErrorValue)) {
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

      const scrollIntoView = (actions, getInput, selectField = false) => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          return listenForActions(actions, () => {
            TestUtils.Simulate.click(getEditPersonalButton(div));

            let input = getInput(getDialog());

            if (!selectField) {
              modifyTextField(input, "");
            }
            TestUtils.Simulate.click(getSave());
          }).then(() => {
            return new Promise(resolve => {
              setTimeout(() => { // ensure that the DOM update after clicking 'save' has finished
                assert(helper.scrollIntoViewStub.called, "Not called yet");
                resolve();
              }, 100);
            });
          });
        });
      };

      describe('text field', () => {
        const preferredName = dialog => inputs(dialog).find(i => i.name === "Nickname / Preferred name");

        it('should clearValidation when filling out a required text field', () => {
          return clearValidation(
            userProfileActions.concat([
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            preferredName,
            { preferred_name: 'Nickname / Preferred name is required' },
            USER_PROFILE_RESPONSE.preferred_name
          );
        });

        it('should scrollIntoView when filling out a required text field', () => {
          return scrollIntoView(
            scrollActions.concat([
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            preferredName,
          );
        });
      });

      describe('date field', () => {
        const dobMonth = dialog => inputs(dialog).find(i => i.id.includes('MM-Month'));
        it('should clearValidation when filling out a required date field', () => {
          return clearValidation(
            userProfileActions.concat([
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            dobMonth,
            { date_of_birth: "Please enter a valid date of birth" },
            String(moment(USER_PROFILE_RESPONSE.date_of_birth).month())
          );
        });

        it('should scrollIntoView when filling out a required date field', () => {
          return scrollIntoView(
            scrollActions.concat([
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            dobMonth,
          );
        });
      });

      describe('select field', () => {
        const languageField = dialog => {
          let select = dialog.querySelector('.select-field.preferred-language');
          clearSelectField(select);
        };

        const removeError = dialog => {
          let select = dialog.querySelector('.select-field.preferred-language');
          modifySelectField(select, USER_PROFILE_RESPONSE.preferred_language);
        };

        it('should clearValidationErrors when filling out a required select field', () => {
          return clearValidation(
            userProfileActions.concat([
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            languageField,
            { preferred_language: "Preferred language is required" },
            removeError,
          );
        });

        it('should scrollIntoView when filling out a required select field', () => {
          return scrollIntoView(
            scrollActions.concat([
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            languageField,
            true
          );
        });
      });

      describe('radio field', () => {
        const genderField = dialog => inputs(dialog).find(i => i.name === "Gender");

        it('should clearValidationErrors when filling out a required radio field', () => {
          const createValidationError = () => {
            helper.store.dispatch(startProfileEdit(SETTINGS.user.username));
            let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
            profile.gender = undefined;
            helper.store.dispatch(updateProfile(SETTINGS.user.username, profile));
          };

          const removeErrorValue = dialog => {
            genderField(dialog).click();
          };

          return clearValidation(
            userProfileActions.concat([
              START_PROFILE_EDIT,
              UPDATE_VALIDATION_VISIBILITY,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            createValidationError,
            { gender: "Gender is required" },
            removeErrorValue,
          );
        });

        it(`should scrollIntoView when filling out a required radio field`, () => {
          return scrollIntoView(
            scrollActions.concat([
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
              UPDATE_VALIDATION_VISIBILITY,
            ]),
            genderField,
          );
        });
      });
    });


    describe("Education History", () => {
      let userProfile;
      let deleteButton = div => {
        return div.getElementsByClassName('profile-form')[1].
          getElementsByClassName('delete-button')[0];
      };

      beforeEach(() => {
        userProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
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
          withArgs(SETTINGS.user.username).
          returns(Promise.resolve(userProfile));
      });

      it('shows the education component', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          let title = div.getElementsByClassName('profile-card-header')[0];
          assert.equal(title.textContent, 'Education');
        });
      });

      it('should show the entries in resume order', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
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
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
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
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
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
            UPDATE_VALIDATION_VISIBILITY,
            CLEAR_PROFILE_EDIT,
          ], () => {
            TestUtils.Simulate.click(firstEducationDeleteButton);
            let dialog = activeDeleteDialog();
            let confirmButton = dialog.getElementsByClassName('delete-button')[0];
            TestUtils.Simulate.click(confirmButton);
          });
        });
      });

      for (let activity of [true, false]) {
        it(`should have proper spinner state during deletion of education for activity=${activity}`, () => {
          const username = SETTINGS.user.username;
          patchUserProfileStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));

          helper.store.dispatch(setShowEducationDeleteDialog(true));
          let dialogActionsSpy = helper.sandbox.spy(inputUtil, 'dialogActions');
          return renderComponent(`/learner/${username}`, userActions).then(() => {
            if (activity) {
              helper.store.dispatch(requestPatchUserProfile(username));
            }
            assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, activity, "Delete"));
          });
        });
      }

      it('should let you edit an education entry', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {

          let editButton = div.getElementsByClassName('profile-form')[1].
            getElementsByClassName('profile-row-icons')[0].
            getElementsByClassName('mdl-button')[0];

          return listenForActions([
            SET_EDUCATION_DIALOG_INDEX,
            SET_EDUCATION_DIALOG_VISIBILITY,
            SET_EDUCATION_DEGREE_LEVEL,
          ], () => {
            TestUtils.Simulate.click(editButton);

            assert.equal(document.querySelector(".profile-form-title").innerHTML, "Edit Education");
          });
        });
      });

      it('should let you add an education entry', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          let addButton = div.querySelector('.add-education-button');

          let expectedProfile = _.cloneDeep(userProfile);
          let entry = {
            ...generateNewEducation(HIGH_SCHOOL),
            graduation_date: "1999-12-01",
            graduation_date_edit: {
              year: '1999',
              month: '12',
              day: undefined
            },
            school_name: "A School",
            school_country: "AF",
            school_state_or_territory: "AF-BAL",
            school_city: "FoobarVille"
          };
          expectedProfile.education.push(entry);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.
            withArgs(expectedProfile.username, expectedProfile).
            returns(Promise.resolve(expectedProfile));

          let expectedActions = [
            START_PROFILE_EDIT,
            SET_EDUCATION_DIALOG_INDEX,
            SET_EDUCATION_DIALOG_VISIBILITY,
            SET_EDUCATION_DIALOG_VISIBILITY,
            SET_EDUCATION_DEGREE_LEVEL,
            SET_EDUCATION_DEGREE_LEVEL,
            UPDATE_PROFILE_VALIDATION,
            REQUEST_PATCH_USER_PROFILE,
            RECEIVE_PATCH_USER_PROFILE_SUCCESS,
            CLEAR_PROFILE_EDIT,
          ];
          for (let i = 0; i < 8; i++) {
            expectedActions.push(UPDATE_PROFILE);
          }
          for (let i = 0; i < 7; i++) {
            expectedActions.push(UPDATE_PROFILE_VALIDATION);
          }
          for (let i = 0; i < 3; i++) {
            expectedActions.push(UPDATE_VALIDATION_VISIBILITY);
          }

          return listenForActions(expectedActions, () => {
            TestUtils.Simulate.click(addButton);

            assert.equal(document.querySelector(".profile-form-title").innerHTML, "Add Education");

            let dialog = document.querySelector('.education-dialog');
            let grid = dialog.getElementsByClassName('profile-tab-grid')[0];
            let inputs = grid.getElementsByTagName('input');

            const modifyEducationSelect = (label, value) => {
              modifySelectField(
                dialog.querySelector(`.select-field${label}`),
                value
              );
            };

            // set the degree type
            modifyEducationSelect('.degree-type', 'High School');

            // fill out graduation date, school name
            modifyTextField(inputs[1], "A School");
            modifyTextField(inputs[2], "12");
            modifyTextField(inputs[3], "1999");

            // set country, state, and city
            modifyEducationSelect('.country', "Afghanistan");
            modifyEducationSelect('.state', "Balkh");
            modifyTextField(inputs[6], "FoobarVille");
            let save = dialog.querySelector('.save-button');
            TestUtils.Simulate.click(save);
          });
        });
      });

      for (const activity of [true, false]) {
        it(`should have proper save button state when activity=${activity}`, () => {
          const username = SETTINGS.user.username;
          let dialogActionsSpy = helper.sandbox.spy(inputUtil, 'dialogActions');
          return renderComponent(`/learner/${username}`, userActions).then(() => {
            if (activity) {
              helper.store.dispatch(requestPatchUserProfile(username));
            }
            assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, activity));
          });
        });
      }
    });

    describe("Employment History", () => {
      let deleteButton = div => {
        return div.getElementsByClassName('profile-form')[2].
          getElementsByClassName('profile-row-icons')[0].
          getElementsByClassName('mdl-button')[1];
      };

      it('shows the employment history component', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([wrapper, ]) => {
          let headerText = wrapper.find('#work-history-card').find('.profile-card-header').text();
          assert.equal(headerText, 'Employment');
        });
      });

      it('should show the entries in resume order', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
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
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
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
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          let updatedProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
          updatedProfile.username = SETTINGS.user.username;

          let rowOfInterest = div.querySelector('#work-history-card').
            querySelectorAll('.profile-form-row')[1];

          let deleteButton = rowOfInterest.querySelector('.delete-button');

          let employerName = rowOfInterest.querySelector('.profile-row-name').textContent.split(',')[0];

          let indexToDelete = USER_PROFILE_RESPONSE.work_history.findIndex(entry => (
            entry.company_name === employerName
          ));

          updatedProfile.work_history.splice(indexToDelete, 1);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.user.username, updatedProfile).returns(
            Promise.resolve(updatedProfile)
          );

          return listenForActions([
            SET_DELETION_INDEX,
            SET_SHOW_WORK_DELETE_DIALOG,
            START_PROFILE_EDIT,
            UPDATE_PROFILE_VALIDATION,
            UPDATE_VALIDATION_VISIBILITY,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_DELETION_INDEX,
            REQUEST_PATCH_USER_PROFILE,
            RECEIVE_PATCH_USER_PROFILE_SUCCESS,
            CLEAR_PROFILE_EDIT,
          ], () => {
            TestUtils.Simulate.click(deleteButton);
            let dialog = activeDeleteDialog();
            let button = dialog.getElementsByClassName('delete-button')[0];
            TestUtils.Simulate.click(button);
          });
        });
      });

      for (let activity of [true, false]) {
        it(`should have proper spinner state during deletion of employment for activity=${activity}`, () => {
          const username = SETTINGS.user.username;
          patchUserProfileStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));

          helper.store.dispatch(setShowWorkDeleteDialog(true));
          let dialogActionsSpy = helper.sandbox.spy(inputUtil, 'dialogActions');
          return renderComponent(`/learner/${username}`, userActions).then(() => {
            if (activity) {
              helper.store.dispatch(requestPatchUserProfile(username));
            }
            assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, activity, "Delete"));
          });
        });
      }

      it('should let you edit a work history entry', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {

          let editButton = div.getElementsByClassName('profile-form')[2].
            getElementsByClassName('profile-row-icons')[0].
            getElementsByClassName('mdl-button')[0];

          return listenForActions([
            SET_WORK_DIALOG_INDEX,
            SET_WORK_DIALOG_VISIBILITY
          ], () => {
            TestUtils.Simulate.click(editButton);

            assert.equal(document.querySelector(".profile-form-title").innerHTML, "Edit Employment");
          });
        });
      });

      it('should let you add a work history entry', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          let addButton = div.getElementsByClassName('profile-form')[2].querySelector('.mm-minor-action');

          let updatedProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
          updatedProfile.username = SETTINGS.user.username;
          let entry = {
            ...generateNewWorkHistory(),
            position: "Assistant Foobar",
            industry: "Accounting",
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
              month: "01",
              day: undefined
            },
            city: "FoobarVille",
            country: "AF",
            state_or_territory: "AF-BAL",
          };
          updatedProfile.work_history.push(entry);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.user.username, updatedProfile).returns(
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
          for (let i = 0; i < 10; i++) {
            expectedActions.push(UPDATE_PROFILE);
            expectedActions.push(UPDATE_PROFILE_VALIDATION);
          }
          for (let i = 0; i < 4; i++) {
            expectedActions.push(UPDATE_VALIDATION_VISIBILITY);
          }

          return listenForActions(expectedActions, () => {
            TestUtils.Simulate.click(addButton);

            assert.equal(document.querySelector(".profile-form-title").innerHTML, "Add Employment");
            let dialog = document.querySelector('.employment-dialog');
            let grid = dialog.querySelector('.profile-tab-grid');
            let inputs = grid.getElementsByTagName('input');

            const modifyWorkSelect = (label, value) => {
              modifySelectField(
                dialog.querySelector(`.select-field${label}`),
                value
              );
            };

            // company name
            modifyTextField(inputs[0], "FoobarCorp");

            // country, state, city
            modifyWorkSelect('.country', "Afghanistan");
            modifyWorkSelect('.state-or-territory', "Balkh");
            modifyTextField(inputs[3], "FoobarVille");

            // industry
            modifyWorkSelect('.industry', "Accounting");

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

      for (let activity of [true, false]) {
        it(`should have proper save button spinner state when activity=${activity}`, () => {
          const username = SETTINGS.user.username;
          let dialogActionsSpy = helper.sandbox.spy(inputUtil, 'dialogActions');
          return renderComponent(`/learner/${username}`, userActions).then(() => {
            if (activity) {
              helper.store.dispatch(requestPatchUserProfile(username));
            }
            assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, activity));
          });
        });
      }
    });

    describe('Personal Info', () => {
      it('should show name and location', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          let name = div.getElementsByClassName('profile-title')[0].textContent;
          assert.deepEqual(name, getPreferredName(USER_PROFILE_RESPONSE));
        });
      });

      it('should not show an email, if present', () => {
        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          assert.isNull(div.querySelector('.profile-email'));
        });
      });

      it('should not show an email, if not present', () => {
        helper.profileGetStub.
          withArgs(SETTINGS.user.username).
          returns(
            Promise.resolve({
              ...USER_PROFILE_RESPONSE,
              email: null,
            })
          );

        const username = SETTINGS.user.username;
        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          assert.isNull(div.querySelector('.profile-email'));
        });
      });

      it('should let you edit personal info', () => {
        const username = SETTINGS.user.username;
        const newFirstName = "New name";
        let expectedProfile = {
          ...USER_PROFILE_RESPONSE,
          first_name: newFirstName
        };
        patchUserProfileStub.
          withArgs(username, expectedProfile).
          returns(Promise.resolve(expectedProfile));

        return renderComponent(`/learner/${username}`, userActions).then(([wrapper]) => {
          let personalButton = wrapper.find('.edit-personal-info-button');

          return listenForActions([
            SET_LEARNER_PAGE_DIALOG_VISIBILITY,
            START_PROFILE_EDIT,
          ], () => {
            personalButton.simulate('click');
          }).then(() => {
            let dialog = document.querySelector('.personal-dialog');
            let inputs = dialog.getElementsByTagName('input');

            return listenForActions([
              UPDATE_PROFILE,
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
            ], () => {
              modifyTextField(inputs[0], newFirstName);
            }).then(() => {
              return listenForActions([
                REQUEST_PATCH_USER_PROFILE,
                RECEIVE_PATCH_USER_PROFILE_SUCCESS,
                UPDATE_VALIDATION_VISIBILITY,
                UPDATE_PROFILE_VALIDATION,
              ], () => {
                TestUtils.Simulate.click(dialog.querySelector('.save-button'));
              }).then(state => {
                assert.deepEqual(state.profiles[username].profile, expectedProfile);
              });
            });
          });
        });
      });

      it('should let you edit about me', () => {
        const username = SETTINGS.user.username;
        const aboutMe = "🐱";
        const expectedProfile = {
          ...USER_PROFILE_RESPONSE,
          about_me: aboutMe
        };
        patchUserProfileStub.
          withArgs(username, expectedProfile).
          returns(Promise.resolve(expectedProfile));

        return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
          let aboutMEBtn = div.querySelector('.edit-about-me-button');

          return listenForActions([
            SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY,
            START_PROFILE_EDIT,
          ], () => {
            TestUtils.Simulate.click(aboutMEBtn);
          }).then(() => {
            let dialog = document.querySelector('.about-me-dialog');
            let textarea = dialog.querySelector('textarea:not([readonly])');

            return listenForActions([
              UPDATE_PROFILE,
              UPDATE_PROFILE_VALIDATION,
              UPDATE_VALIDATION_VISIBILITY,
            ], () => {
              modifyTextArea(textarea, aboutMe);
            }).then(() => {
              return listenForActions([
                REQUEST_PATCH_USER_PROFILE,
                RECEIVE_PATCH_USER_PROFILE_SUCCESS,
                UPDATE_VALIDATION_VISIBILITY,
                UPDATE_PROFILE_VALIDATION,
              ], () => {
                TestUtils.Simulate.click(dialog.querySelector(".save-button"));
              }).then(state => {
                assert.deepEqual(state.profiles[username].profile, expectedProfile);
              });
            });
          });
        });
      });

      for (const activity of [true, false]) {
        it(`should have proper button spinner state while a PATCH is in progress for activity=${activity}`, () => {
          const username = SETTINGS.user.username;
          const dialogActionsSpy = helper.sandbox.spy(inputUtil, 'dialogActions');
          return renderComponent(`/learner/${username}`, userActions).then(() => {
            if (activity) {
              helper.store.dispatch(requestPatchUserProfile(username));
            }
            assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, activity));
          });
        });
      }
    });

    it("should show all edit, delete icons for an authenticated user's own page" , () => {
      const username = SETTINGS.user.username;
      return renderComponent(`/learner/${username}`, userActions).then(([, div]) => {
        let count = div.getElementsByClassName('mdl-button--icon').length;
        // edit profile and edit about me represents hard coded 2 here.
        assert.equal(count,
          2 + USER_PROFILE_RESPONSE.work_history.length * 2 + USER_PROFILE_RESPONSE.education.length * 2
        );
      });
    });

    it("should not show any edit, delete icons for other user pages" , () => {
      let otherProfile = {
        ...USER_PROFILE_RESPONSE,
        username: 'other'
      };
      helper.profileGetStub.withArgs('other').returns(Promise.resolve(otherProfile));
      return renderComponent(`/learner/other`, userActions).then(([, div]) => {
        let count = div.getElementsByClassName('mdl-button--icon').length;
        assert.equal(count, 0);
      });
    });
  });

  describe("Unauthenticated user page", () => {
    let anonymousUserActions = [
      REQUEST_GET_USER_PROFILE,
      RECEIVE_GET_USER_PROFILE_SUCCESS,
    ];
    beforeEach(() => {
      helper = new IntegrationTestHelper();
      listenForActions = helper.listenForActions.bind(helper);
      renderComponent = helper.renderComponent.bind(helper);
      helper.profileGetStub.
        withArgs(USER_PROFILE_RESPONSE.username).
        returns(Promise.resolve(USER_PROFILE_RESPONSE));
      SETTINGS.user = null;
    });

    afterEach(() => {
      helper.cleanup();
    });

    it('should hide all edit, delete icons', () => {
      const username = USER_PROFILE_RESPONSE.username;
      return renderComponent(`/learner/${username}`, anonymousUserActions).then(([, div]) => {
        assert.equal(0, div.getElementsByClassName('mdl-button--icon').length);
      });
    });

    it('should show sign in button with valid link', () => {
      const username = USER_PROFILE_RESPONSE.username;
      return renderComponent(`/learner/${username}`, anonymousUserActions).then(([, div]) => {
        let button = div.querySelector("a[href='/login/edxorg/']");
        assert.equal(button.textContent.trim(), "Sign in with edX.org");
      });
    });
  });
});
