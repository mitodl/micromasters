/* global document: false, window: false */
import '../global_init';

import ReactDOM from 'react-dom';
import { assert } from 'chai';
import _ from 'lodash';

import {
  CLEAR_DASHBOARD,
  CLEAR_PROFILE,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
} from '../actions';
import {
  CLEAR_ENROLLMENTS,
} from '../actions/enrollments';
import {
  CLEAR_UI,
  SET_PROFILE_STEP,
} from '../actions/ui';
import {
  USER_PROFILE_RESPONSE,
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
  PRIVACY_STEP,
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
      return listenForActions([CLEAR_DASHBOARD, CLEAR_PROFILE, CLEAR_UI, CLEAR_ENROLLMENTS], () => {
        ReactDOM.unmountComponentAtNode(div);
      });
    });
  });

  describe('profile completeness', () => {
    let checkStep = () => helper.store.getState().ui.profileStep;

    it('redirects to /profile if profile is not complete', () => {
      let response = Object.assign({}, USER_PROFILE_RESPONSE, {
        first_name: undefined
      });
      helper.profileGetStub.returns(Promise.resolve(response));

      return renderComponent("/dashboard", editProfileActions).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile");
        assert.equal(checkStep(), PERSONAL_STEP);
      });
    });

    it('redirects to /profile if profile is not filled out', () => {
      let response = Object.assign({}, USER_PROFILE_RESPONSE, {
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

    it('redirects to /profile and goes to the privacy step if a field is missing there', () => {
      let response = Object.assign({}, USER_PROFILE_RESPONSE, {
        account_privacy: ''
      });
      helper.profileGetStub.returns(Promise.resolve(response));

      return renderComponent("/dashboard", editProfileActions).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile");
        assert.equal(checkStep(), PRIVACY_STEP);
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
});
