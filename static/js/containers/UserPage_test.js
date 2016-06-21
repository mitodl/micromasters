/* global SETTINGS: false */
import '../global_init';
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import { 
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  REQUEST_GET_USER_PROFILE,
  START_PROFILE_EDIT,
  UPDATE_PROFILE,
  UPDATE_PROFILE_VALIDATION,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
} from '../actions';
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
import {
  generateNewEducation,
  generateNewWorkHistory,
} from '../util/util';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../util/api';
import { USER_PROFILE_RESPONSE, HIGH_SCHOOL } from '../constants';

describe("UserPage", function() {
  this.timeout(5000);

  let listenForActions, renderComponent, helper, patchUserProfileStub;
  let userActions = [RECEIVE_GET_USER_PROFILE_SUCCESS, REQUEST_GET_USER_PROFILE];

  let modifyTextField = (field, text) => {
    field.value = text;
    TestUtils.Simulate.change(field);
    TestUtils.Simulate.keyDown(field, {key: "Enter", keyCode: 13, which: 13});
  };

  let openDialog = () => {
    return [...document.getElementsByClassName('deletion-confirmation')].find(dialog => (
      dialog.style["left"] === "0px"
    ));
  };

  describe ("Authenticated user page", () => {
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

    describe("Education History", () => {
      let deleteButton = div => {
        return div.getElementsByClassName('profile-tab-card')[1].
          getElementsByClassName('delete-button')[0];
      };

      it('shows the education component', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let title = div.getElementsByClassName('profile-card-title')[1];
          assert.equal(title.textContent, 'Education');
        });
      });

      it('should confirm deletion and let you cancel', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let button = deleteButton(div);

          return listenForActions([
            SET_DELETION_INDEX,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_DELETION_INDEX
          ], () => {
            TestUtils.Simulate.click(button);
            let dialog = openDialog();
            let cancelButton = dialog.getElementsByClassName('cancel-button')[0];
            TestUtils.Simulate.click(cancelButton);
          });
        });
      });

      it('should confirm deletion and let you continue', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let updatedProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
          updatedProfile.username = SETTINGS.username;
          updatedProfile.education.splice(0,1);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(
            Promise.resolve(updatedProfile)
          );

          let button = deleteButton(div);

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
            TestUtils.Simulate.click(button);
            let dialog = openDialog();
            button = dialog.getElementsByClassName('delete-button')[0];
            TestUtils.Simulate.click(button);
          });
        });
      });

      it('should let you edit an education entry', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {

          let editButton = div.getElementsByClassName('profile-tab-card')[1].
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
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let addButton = div.getElementsByClassName('profile-tab-card')[1].
            getElementsByClassName('profile-add-button')[0];

          let updatedProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
          updatedProfile.username = SETTINGS.username;
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
          updatedProfile.education.push(entry);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(
            Promise.resolve(updatedProfile)
          );

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

            let dialog = document.querySelector('.education-dashboard-dialog');
            let grid = dialog.getElementsByClassName('profile-tab-grid')[0];
            let inputs = grid.getElementsByTagName('input');

            // set the degree type
            modifyTextField(inputs[0], "High School");

            // fill out graduation date, school name
            modifyTextField(inputs[1], "12");
            modifyTextField(inputs[2], "1999");
            modifyTextField(inputs[3], "A School");

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
        return div.getElementsByClassName('profile-tab-card')[0].
          getElementsByClassName('profile-row-icons')[0].
          getElementsByClassName('mdl-button')[1];
      };

      it('shows the employment history component', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let title = div.getElementsByClassName('profile-card-title')[0];
          assert.equal(title.textContent, 'Employment');
        });
      });

      it('should confirm deletion and let you cancel', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let button = deleteButton(div);

          return listenForActions([
            SET_DELETION_INDEX,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_SHOW_WORK_DELETE_DIALOG,
            SET_SHOW_EDUCATION_DELETE_DIALOG,
            SET_DELETION_INDEX,
          ], () => {
            TestUtils.Simulate.click(button);
            let dialog = openDialog();
            let cancelButton = dialog.getElementsByClassName('cancel-button')[0];
            TestUtils.Simulate.click(cancelButton);
          });
        });
      });

      it('should confirm deletion and let you continue', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let updatedProfile = _.cloneDeep(USER_PROFILE_RESPONSE);
          updatedProfile.username = SETTINGS.username;
          updatedProfile.work_history.splice(0,1);

          patchUserProfileStub.throws("Invalid arguments");
          patchUserProfileStub.withArgs(SETTINGS.username, updatedProfile).returns(
            Promise.resolve(updatedProfile)
          );

          let deleteButton = div.getElementsByClassName('profile-tab-card')[0].
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
            let dialog = openDialog();
            let button = dialog.getElementsByClassName('delete-button')[0];
            TestUtils.Simulate.click(button);
          });
        });
      });

      it('should let you edit a work history entry', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {

          let editButton = div.getElementsByClassName('profile-tab-card')[0].
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
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let addButton = div.getElementsByClassName('profile-tab-card')[0].
            getElementsByClassName('profile-add-button')[0];

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
              month: "01",
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
            let dialog = document.querySelector('.employment-dashboard-dialog');
            let grid = dialog.getElementsByClassName('profile-tab-grid')[0];
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
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let name = div.getElementsByClassName('users-name')[0].textContent;
          assert.deepEqual(name, USER_PROFILE_RESPONSE.preferred_name);

          let location = div.getElementsByClassName('users-location')[0].textContent;

          assert.deepEqual(location, `${USER_PROFILE_RESPONSE.city}, `);
        });
      });

      it('should let you edit personal info', () => {
        return renderComponent(`/users/${SETTINGS.username}`, userActions).then(([, div]) => {
          let personalButton = div.getElementsByClassName('material-icons')[0];

          return listenForActions([SET_USER_PAGE_DIALOG_VISIBILITY], () => {
            TestUtils.Simulate.click(personalButton);
          });
        });
      });
    });
  });

  describe("Unauthenticated user page", () => {
    beforeEach(() => {
      helper = new IntegrationTestHelper();
      listenForActions = helper.listenForActions.bind(helper);
      renderComponent = helper.renderComponent.bind(helper);    
      patchUserProfileStub = helper.sandbox.stub(api, 'patchUserProfile');
      helper.profileGetStub.
        withArgs(SETTINGS.username).
        returns (
        Promise.resolve(Object.assign({}, USER_PROFILE_RESPONSE))
      );
    });

    afterEach(() => {
      helper.cleanup();
    });

    it('should hide all edit, delete icons', () => {
      return renderComponent(`/users/${SETTINGS.username}`, userActions).then(() => {
        let icons = [...document.getElementsByClassName('mdl-button--icons')];
        assert.deepEqual(icons, []);
      });
    });
  });
});
