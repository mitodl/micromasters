/* global document: false, window: false, SETTINGS: false */
import '../global_init';

import ReactDOM from 'react-dom';
import { assert } from 'chai';
import _ from 'lodash';

import Navbar from '../components/Navbar';
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
} from '../actions';
import {
  REQUEST_FETCH_COUPONS,
  RECEIVE_FETCH_COUPONS_SUCCESS,
} from '../actions/coupons';
import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  CLEAR_PROFILE,
  START_PROFILE_EDIT,
  UPDATE_VALIDATION_VISIBILITY,
  UPDATE_PROFILE_VALIDATION,
} from '../actions/profile';
import {
  CLEAR_ENROLLMENTS,
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
} from '../actions/programs';
import * as enrollmentActions from '../actions/programs';
import {
  CLEAR_UI,
  SET_PROFILE_STEP,
  setNavDrawerOpen,
  SET_NAV_DRAWER_OPEN,
  SET_PHOTO_DIALOG_VISIBILITY,
  SET_TOAST_MESSAGE,
} from '../actions/ui';
import * as uiActions from '../actions/ui';
import { USER_PROFILE_RESPONSE } from '../test_constants';
import {
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
} from '../constants';
import IntegrationTestHelper from '../util/integration_test_helper';
import { GoogleMapsStub } from '../util/test_utils';
import { SUCCESS_ACTIONS } from './test_util';

const REDIRECT_ACTIONS = SUCCESS_ACTIONS.concat([
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  UPDATE_VALIDATION_VISIBILITY,
  SET_PROFILE_STEP,
  SET_TOAST_MESSAGE,
]);

describe('App', function() {
  let listenForActions, renderComponent, helper, gmaps;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    gmaps = new GoogleMapsStub();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);
  });

  afterEach(() => {
    helper.cleanup();
    gmaps.cleanup();
  });

  it('clears profile, ui, and enrollments after unmounting', () => {
    return renderComponent('/').then(([, div]) => {
      return listenForActions([
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

    it('redirects to /profile/personal if profile is not complete', () => {
      let response = {
        ...USER_PROFILE_RESPONSE,
        first_name: undefined,
      };
      helper.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(response));

      return renderComponent("/", REDIRECT_ACTIONS).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile/personal");
        assert.equal(checkStep(), PERSONAL_STEP);
      });
    });

    it('redirects to /profile/professional if profile is not filled out', () => {
      let response = {
        ...USER_PROFILE_RESPONSE,
        filled_out: false,
      };
      helper.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(response));

      return renderComponent("/", REDIRECT_ACTIONS).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile/professional");
        assert.equal(checkStep(), EMPLOYMENT_STEP);
      });
    });

    it('redirects to /profile/professional if a field is missing there', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].city = "";

      helper.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(profile));
      return renderComponent("/", REDIRECT_ACTIONS).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile/professional");
        assert.equal(checkStep(), EMPLOYMENT_STEP);
      });
    });

    it('redirects to /profile/education if a field is missing there', () => {
      let response = _.cloneDeep(USER_PROFILE_RESPONSE);
      response.education[0].school_name = '';
      helper.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(response));

      return renderComponent("/", REDIRECT_ACTIONS).then(() => {
        assert.equal(helper.currentLocation.pathname, "/profile/education");
        assert.equal(checkStep(), EDUCATION_STEP);
      });
    });
  });

  describe('enrollments', () => {
    it('shows an error message if the enrollments GET fetch fails', () => {
      helper.programsGetStub.returns(Promise.reject());
      let types = [
        REQUEST_DASHBOARD,
        RECEIVE_DASHBOARD_SUCCESS,
        REQUEST_COURSE_PRICES,
        RECEIVE_COURSE_PRICES_SUCCESS,
        REQUEST_FETCH_COUPONS,
        RECEIVE_FETCH_COUPONS_SUCCESS,
        REQUEST_GET_USER_PROFILE,
        RECEIVE_GET_USER_PROFILE_SUCCESS,
        REQUEST_GET_PROGRAM_ENROLLMENTS,
        RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
      ];
      return renderComponent('/dashboard', types).then(([wrapper]) => {
        let text = wrapper.find('.page-content').text();
        assert(text.includes("Sorry, we were unable to load the data"));
      });
    });

    it('setEnrollDialogVisibility dispatches the value to the action with the same name', () => {
      return renderComponent('/').then(([wrapper]) => {
        let props = wrapper.find(Navbar).props();
        let stub = helper.sandbox.stub(uiActions, 'setEnrollDialogVisibility');
        stub.returns({type: "fake"});
        props.setEnrollDialogVisibility("value");
        assert(stub.calledWith("value"));
      });
    });

    it('setEnrollSelectedProgram dispatches the value to the action with the same name', () => {
      return renderComponent('/').then(([wrapper]) => {
        let props = wrapper.find(Navbar).props();
        let stub = helper.sandbox.stub(uiActions, 'setEnrollSelectedProgram');
        stub.returns({type: "fake"});
        props.setEnrollSelectedProgram("value");
        assert(stub.calledWith("value"));
      });
    });

    it('setCurrentProgramEnrollment dispatches the value to the action with the same name', () => {
      return renderComponent('/').then(([wrapper]) => {
        let props = wrapper.find(Navbar).props();
        let stub = helper.sandbox.stub(enrollmentActions, 'setCurrentProgramEnrollment');
        stub.returns({type: "fake"});
        props.setCurrentProgramEnrollment("value");
        assert(stub.calledWith("value"));
      });
    });
  });

  describe('navbar', () => {
    for (const [title, url] of [
      ['Dashboard', '/dashboard'],
      ['View Profile', `/learner/${SETTINGS.user.username}`],
      ['Settings', '/settings'],
    ]) {
      it(`closes the drawer and changes the URL when ${title} is clicked`, () => {
        helper.store.dispatch(setNavDrawerOpen(true));
        return renderComponent("/").then(([wrapper]) => {
          let node = wrapper.find(".nav-drawer").find("Link").filterWhere(x => x.text() === title);
          assert.equal(node.props().to, url);

          return listenForActions([SET_NAV_DRAWER_OPEN], () => {
            node.simulate('click');
          }).then(state => {
            assert.isFalse(state.ui.navDrawerOpen);
          });
        });
      });
    }
  });

  it('closes the drawer and shows the photo dialog when edit photo is clicked', () => {
    helper.store.dispatch(setNavDrawerOpen(true));
    return renderComponent("/").then(([wrapper]) => {
      let node = wrapper.find("button").filterWhere(x => x.text() === "Edit Photo");

      return listenForActions([
        SET_NAV_DRAWER_OPEN,
        SET_PHOTO_DIALOG_VISIBILITY,
      ], () => {
        node.simulate('click');
      }).then(state => {
        assert.isFalse(state.ui.navDrawerOpen);
        assert.isTrue(state.ui.photoDialogVisibility);
      });
    });
  });
});
