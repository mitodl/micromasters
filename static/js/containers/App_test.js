/* global document: false, window: false */
import '../global_init';

import ReactDOM from 'react-dom';
import { assert } from 'chai';
import _ from 'lodash';

import Navbar from '../components/Navbar';
import {
  CLEAR_DASHBOARD,
  CLEAR_COURSE_PRICES,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_COURSE_PRICES_SUCCESS,
} from '../actions';
import {
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  CLEAR_PROFILE,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
} from '../actions/profile';
import {
  CLEAR_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
} from '../actions/programs';
import * as enrollmentActions from '../actions/programs';
import {
  CLEAR_UI,
  SET_PROFILE_STEP,
} from '../actions/ui';
import * as uiActions from '../actions/ui';
import {
  USER_PROFILE_RESPONSE,
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
} from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';

describe('App', () => {
  let listenForActions, renderComponent, helper;
  let editProfileActions;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);
    editProfileActions = [
      START_PROFILE_EDIT,
      UPDATE_PROFILE_VALIDATION,
      SET_PROFILE_STEP,
    ];
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('clears profile, ui, enrollments, and dashboard after unmounting', () => {
    return renderComponent("/dashboard").then(([, div]) => {
      return listenForActions([
        CLEAR_DASHBOARD,
        CLEAR_COURSE_PRICES,
        CLEAR_PROFILE,
        CLEAR_UI,
        CLEAR_ENROLLMENTS
      ], () => {
        ReactDOM.unmountComponentAtNode(div);
      });
    });
  });
  describe('profile completeness', () => {
    let checkStep = () => helper.store.getState().ui.profileStep;

    it('redirects to /profile if profile is not complete', () => {
      let response = Object.assign(_.cloneDeep(USER_PROFILE_RESPONSE), {
        first_name: undefined
      });
      helper.profileGetStub.returns(Promise.resolve(response));

      return renderComponent("/dashboard", editProfileActions).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile");
        assert.equal(checkStep(), PERSONAL_STEP);
      });
    });

    it('redirects to /profile if profile is not filled out', () => {
      let response = Object.assign(_.cloneDeep(USER_PROFILE_RESPONSE), {
        filled_out: false
      });
      helper.profileGetStub.returns(Promise.resolve(response));

      return renderComponent("/dashboard").then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile");
        assert.equal(checkStep(), PERSONAL_STEP);
      });
    });

    it('redirects to /profile and goes to the employment step if a field is missing there', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].city = "";

      helper.profileGetStub.returns(Promise.resolve(profile));
      return renderComponent("/dashboard", editProfileActions).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile");
        assert.equal(checkStep(), EMPLOYMENT_STEP);
      });
    });

    it('redirects to /profile and goes to the education step if a field is missing there', () => {
      let response = _.cloneDeep(USER_PROFILE_RESPONSE);
      response.education[0].school_name = '';
      helper.profileGetStub.returns(Promise.resolve(response));

      return renderComponent("/dashboard", editProfileActions).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile");
        assert.equal(checkStep(), EDUCATION_STEP);
      });
    });
  });

  describe('enrollments', () => {
    it('shows an error message if the enrollments GET fetch fails', () => {
      helper.enrollmentsGetStub.returns(Promise.reject());
      let types = [
        RECEIVE_DASHBOARD_SUCCESS,
        RECEIVE_COURSE_PRICES_SUCCESS,
        RECEIVE_GET_USER_PROFILE_SUCCESS,
        RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
      ];
      return renderComponent("/dashboard", types, false).then(([wrapper]) => {
        let text = wrapper.find('.page-content').text();
        assert(text.includes("Sorry, we were unable to load the data"));
      });
    });

    it('setEnrollDialogVisibility dispatches the value to the action with the same name', () => {
      return renderComponent("/dashboard").then(([wrapper]) => {
        let props = wrapper.find(Navbar).props();
        let stub = helper.sandbox.stub(uiActions, 'setEnrollDialogVisibility');
        stub.returns({type: "fake"});
        props.setEnrollDialogVisibility("value");
        assert(stub.calledWith("value"));
      });
    });

    it('setEnrollSelectedProgram dispatches the value to the action with the same name', () => {
      return renderComponent("/dashboard").then(([wrapper]) => {
        let props = wrapper.find(Navbar).props();
        let stub = helper.sandbox.stub(uiActions, 'setEnrollSelectedProgram');
        stub.returns({type: "fake"});
        props.setEnrollSelectedProgram("value");
        assert(stub.calledWith("value"));
      });
    });

    it('setCurrentProgramEnrollment dispatches the value to the action with the same name', () => {
      return renderComponent("/dashboard").then(([wrapper]) => {
        let props = wrapper.find(Navbar).props();
        let stub = helper.sandbox.stub(enrollmentActions, 'setCurrentProgramEnrollment');
        stub.returns({type: "fake"});
        props.setCurrentProgramEnrollment("value");
        assert(stub.calledWith("value"));
      });
    });
  });
});
