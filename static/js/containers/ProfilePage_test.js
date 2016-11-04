/* global SETTINGS: false */
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import _ from 'lodash';

import {
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
} from '../actions/programs';
import {
  REQUEST_GET_USER_PROFILE,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  UPDATE_VALIDATION_VISIBILITY,
  CLEAR_PROFILE_EDIT,
} from '../actions/profile';
import {
  setProfileStep,
  setProgram,
  SET_PROFILE_STEP,
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
    patchUserProfileStub.withArgs(SETTINGS.user.username, updatedProfile).returns(Promise.resolve(updatedProfile));

    if ( actions.length === 0 ) {
      if (!validationFailure) {
        actions.push(
          REQUEST_PATCH_USER_PROFILE,
          RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        );
      }
      actions.push(
        UPDATE_PROFILE_VALIDATION,
        UPDATE_VALIDATION_VISIBILITY,
        START_PROFILE_EDIT,
      );
    }

    return listenForActions(actions, () => {
      TestUtils.Simulate.click(button);
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
      setStep(EDUCATION_STEP);
      return renderComponent('/profile', [START_PROFILE_EDIT]).then(dialogTest);
    });

    it('should launch a dialog to add an entry when an employment switch is set to Yes', () => {
      let dialogTest = ([, div]) => {
        let toggle = radioToggles(div, '.profile-radio-switch');
        TestUtils.Simulate.change(toggle[0]);
        activeDialog('employment-dialog-wrapper');
      };
      setStep(EMPLOYMENT_STEP);
      return renderComponent('/profile', [START_PROFILE_EDIT]).then(dialogTest);
    });
  });

  it('navigates backward when Previous button is clicked', () => {
    setStep(EDUCATION_STEP);
    const checkStep = () => helper.store.getState().ui.profileStep;
    return renderComponent('/profile', [START_PROFILE_EDIT]).then(([, div]) => {
      let button = div.querySelector(prevButtonSelector);
      assert.equal(checkStep(), EDUCATION_STEP);
      TestUtils.Simulate.click(button);
      assert(helper.scrollIntoViewStub.called, "Not called yet");
      assert.equal(checkStep(), PERSONAL_STEP);
    });
  });

  for (let step of profileSteps.slice(0,2)) {
    for (let filledOutValue of [true, false]) {
      it(`respects the current value (${filledOutValue}) when saving on ${step}`, () => {
        setStep(step);
        let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          filled_out: filledOutValue,
          education: []
        });
        helper.profileGetStub.returns(Promise.resolve(updatedProfile));
        return renderComponent('/profile', [START_PROFILE_EDIT]).then(([, div]) => {
          // close all switches
          if (`${step}` === 'personal') {
            return confirmSaveButtonBehavior(updatedProfile, {div: div}, true);
          }
          return confirmSaveButtonBehavior(updatedProfile, {div: div});
        });
      });
    }
  }

  it('shows a spinner when profile get is processing', () => {
    return renderComponent('/profile', [START_PROFILE_EDIT]).then(([, div]) => {
      assert.notOk(div.querySelector(".loader"), "Found spinner but no fetch in progress");
      helper.store.dispatch({
        type: REQUEST_GET_USER_PROFILE,
        payload: {
          username: SETTINGS.user.username
        }
      });

      assert(div.querySelector(".loader"), "Unable to find spinner");
    });
  });

  it('should enroll the user when they go to the next page', () => {
    let addEnrollmentStub = helper.sandbox.stub(api, 'addProgramEnrollment');
    let program = PROGRAMS[0];
    addEnrollmentStub.returns(Promise.resolve(program));

    patchUserProfileStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));

    helper.store.dispatch(setProgram(program));
    return renderComponent(`/profile`, [START_PROFILE_EDIT]).then(([wrapper]) => {
      assert.isFalse(addEnrollmentStub.called);

      return helper.listenForActions([
        REQUEST_PATCH_USER_PROFILE,
        RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        CLEAR_PROFILE_EDIT,
        UPDATE_PROFILE_VALIDATION,
        REQUEST_ADD_PROGRAM_ENROLLMENT,
        RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
        SET_PROFILE_STEP,
        START_PROFILE_EDIT,
        UPDATE_VALIDATION_VISIBILITY,
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
      setStep(step);
      return renderComponent('/profile', [START_PROFILE_EDIT]).then(([wrapper]) => {
        let props = wrapper.find(component).props();
        assert.deepEqual(props['ui'], helper.store.getState().ui);
        assert.deepEqual(props['programs'], helper.store.getState().programs.availablePrograms);
        assert.deepEqual(props['profile'], helper.store.getState().profiles['jane'].profile);
      });
    });
  }
});
