/* global SETTINGS: false */

import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import {
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
} from '../actions/programs';
import {
  requestGetUserProfile,
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  requestPatchUserProfile,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  UPDATE_VALIDATION_VISIBILITY,
  CLEAR_PROFILE_EDIT,
} from '../actions/profile';
import {
  setProgram,
  SET_PROFILE_STEP,
  SET_TOAST_MESSAGE,
} from '../actions/ui';
import {
  USER_PROFILE_RESPONSE,
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
  PROGRAMS,
} from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../lib/api';
import { activeDialog } from '../util/test_utils';

describe("ProfilePage", function() {
  this.timeout(5000);  // eslint-disable-line no-invalid-this

  let listenForActions, renderComponent, helper, patchUserProfileStub;
  let profileSteps = [
    PERSONAL_STEP,
    EDUCATION_STEP,
    EMPLOYMENT_STEP,
  ];
  let prevButtonSelector = '.prev';
  let nextButtonSelector = '.next';

  const SUCCESS_ACTIONS = [
    REQUEST_GET_USER_PROFILE,
    RECEIVE_GET_USER_PROFILE_SUCCESS,
    REQUEST_GET_PROGRAM_ENROLLMENTS,
    RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
    START_PROFILE_EDIT,
    START_PROFILE_EDIT,
    SET_PROFILE_STEP,
  ];

  const REDIRECT_ACTIONS = SUCCESS_ACTIONS.concat([
    SET_PROFILE_STEP,
  ]);

  const getStep = () => helper.store.getState().ui.profileStep;

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
    patchUserProfileStub.withArgs(SETTINGS.user.username, updatedProfile).returns(Promise.resolve(updatedProfile));

    let actions;
    if (!validationFailure) {
      actions = [
        UPDATE_PROFILE_VALIDATION,
        UPDATE_VALIDATION_VISIBILITY,
        REQUEST_PATCH_USER_PROFILE,
        RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        CLEAR_PROFILE_EDIT,
        SET_PROFILE_STEP,
      ];
    } else {
      actions = [
        UPDATE_PROFILE_VALIDATION,
        UPDATE_VALIDATION_VISIBILITY,
      ];
    }

    return listenForActions(actions, () => {
      TestUtils.Simulate.click(button);
    }).then(state => {
      if (!validationFailure) {
        assert.deepEqual(state.profiles[SETTINGS.user.username].edit, undefined);
      }
      return state;
    });
  };

  let radioToggles = (div, selector) => div.querySelector(selector).getElementsByTagName('input');

  describe('switch toggling behavior', () => {
    beforeEach(() => {
      let userProfile = Object.assign({}, _.cloneDeep(USER_PROFILE_RESPONSE), {
        education: [],
        work_history: []
      });
      helper.profileGetStub.
        withArgs(SETTINGS.user.username).
        returns(
          Promise.resolve(Object.assign({}, userProfile, {
            username: SETTINGS.user.username
          }))
        );
    });

    it('should launch a dialog to add an entry when an education switch is set to Yes', () => {
      let dialogTest = ([, div]) => {
        let toggle = radioToggles(div, '.profile-radio-switch');
        TestUtils.Simulate.change(toggle[0]);
        activeDialog('education-dialog-wrapper');
      };
      return renderComponent('/profile/education', SUCCESS_ACTIONS).then(dialogTest);
    });

    it('should launch a dialog to add an entry when an employment switch is set to Yes', () => {
      let dialogTest = ([, div]) => {
        let toggle = radioToggles(div, '.profile-radio-switch');
        TestUtils.Simulate.change(toggle[0]);
        activeDialog('employment-dialog-wrapper');
      };
      return renderComponent('/profile/professional', SUCCESS_ACTIONS).then(dialogTest);
    });
  });

  describe('profile completeness', () => {
    it('redirects to /profile/personal if profile is not complete', () => {
      let response = Object.assign(_.cloneDeep(USER_PROFILE_RESPONSE), {
        first_name: undefined
      });
      helper.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(response));

      return renderComponent("/profile/education", REDIRECT_ACTIONS).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile/personal");
        assert.equal(getStep(), PERSONAL_STEP);
      });
    });

    it('redirects to /profile/education if a field is missing there', () => {
      let response = _.cloneDeep(USER_PROFILE_RESPONSE);
      response.education[0].school_name = '';
      helper.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(response));

      return renderComponent("/profile/professional", REDIRECT_ACTIONS).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile/education");
        assert.equal(getStep(), EDUCATION_STEP);
      });
    });
  });

  it('navigates backward when Previous button is clicked', () => {
    return renderComponent('/profile/education', SUCCESS_ACTIONS).then(([, div]) => {
      let button = div.querySelector(prevButtonSelector);
      assert.equal(getStep(), EDUCATION_STEP);
      TestUtils.Simulate.click(button);
      assert.equal(getStep(), PERSONAL_STEP);
    });
  });

  for (let step of profileSteps.slice(0,2)) {
    for (let filledOutValue of [true, false]) {
      it(`respects the current value (${filledOutValue}) when saving on ${step}`, () => {
        let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          filled_out: filledOutValue,
          education: [],
          work_history: [],
        });
        helper.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(updatedProfile));
        return renderComponent(`/profile/${step}`, SUCCESS_ACTIONS).then(([, div]) => {
          // close all switches
          if (step === 'personal') {
            return confirmSaveButtonBehavior(updatedProfile, {div: div}, true);
          }
          return confirmSaveButtonBehavior(updatedProfile, {div: div});
        });
      });
    }
  }

  it('shows a spinner when profile get is processing', () => {
    return renderComponent('/profile/personal', SUCCESS_ACTIONS).then(([wrapper]) => {
      assert.equal(wrapper.find(".loader").length, 0);
      helper.store.dispatch(requestGetUserProfile(SETTINGS.user.username));

      assert.equal(wrapper.find(".loader").length, 1);
    });
  });

  it('disables the button and shows a spinner when profile patch is processing', () => {
    return renderComponent('/profile/personal', SUCCESS_ACTIONS).then(([wrapper]) => {
      helper.store.dispatch(requestPatchUserProfile(SETTINGS.user.username));

      let next = wrapper.find(".next");
      assert(next.props().className.includes("disabled-with-spinner"));
      next.simulate("click");
      assert.isFalse(patchUserProfileStub.called);
    });
  });

  it('should enroll the user when they go to the next page', () => {
    let addEnrollmentStub = helper.sandbox.stub(api, 'addProgramEnrollment');
    let program = PROGRAMS[0];
    addEnrollmentStub.returns(Promise.resolve(program));

    patchUserProfileStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));

    helper.store.dispatch(setProgram(program));
    return renderComponent('/profile/personal', SUCCESS_ACTIONS).then(([wrapper]) => {
      assert.isFalse(addEnrollmentStub.called);

      return helper.listenForActions([
        REQUEST_PATCH_USER_PROFILE,
        RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        CLEAR_PROFILE_EDIT,
        UPDATE_PROFILE_VALIDATION,
        REQUEST_ADD_PROGRAM_ENROLLMENT,
        RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
        SET_PROFILE_STEP,
        UPDATE_VALIDATION_VISIBILITY,
        SET_TOAST_MESSAGE,
      ], () => {
        wrapper.find(".next").simulate("click");
      }).then(() => {
        assert.isTrue(addEnrollmentStub.called);
      });
    });
  });

  for (let [step, component] of [
    [PERSONAL_STEP, 'PersonalTab'],
    [EDUCATION_STEP, 'EducationTab'],
    [EMPLOYMENT_STEP, 'EmploymentTab'],
  ]) {
    it(`sends the right props to tab components for step ${step}`, () => {
      return renderComponent(`/profile/${step}`, SUCCESS_ACTIONS).then(([wrapper]) => {
        let props = wrapper.find(component).props();
        assert.deepEqual(props['ui'], helper.store.getState().ui);
        assert.deepEqual(props['programs'], helper.store.getState().programs.availablePrograms);
        assert.deepEqual(props['profile'], helper.store.getState().profiles['jane'].profile);
      });
    });
  }
});
