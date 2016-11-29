/* global SETTINGS: false */
import _ from 'lodash';
import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';

import {
  fetchUserProfile,
  receiveGetUserProfileSuccess,
  clearProfile,
  saveProfile,
  updateProfile,
  updateProfileValidation,
  startProfileEdit,
  clearProfileEdit,
  updateValidationVisibility,
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  RECEIVE_GET_USER_PROFILE_FAILURE,
  CLEAR_PROFILE,
  UPDATE_PROFILE,
  UPDATE_PROFILE_VALIDATION,
  START_PROFILE_EDIT,
  CLEAR_PROFILE_EDIT,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  RECEIVE_PATCH_USER_PROFILE_FAILURE,
} from '../actions/profile';
import {
  fetchDashboard,
  clearDashboard,
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
  CLEAR_DASHBOARD,
  receiveDashboardSuccess,

  checkout,
  REQUEST_CHECKOUT,
  RECEIVE_CHECKOUT_SUCCESS,
  RECEIVE_CHECKOUT_FAILURE,

  fetchCoursePrices,
  clearCoursePrices,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
  RECEIVE_COURSE_PRICES_FAILURE,
  CLEAR_COURSE_PRICES,

  updateCourseStatus,
  UPDATE_COURSE_STATUS,

  FETCH_FAILURE,
  FETCH_SUCCESS
} from '../actions/index';
import * as api from '../lib/api';
import {
  COURSE_PRICES_RESPONSE,
  DASHBOARD_RESPONSE,
  USER_PROFILE_RESPONSE,
  CYBERSOURCE_CHECKOUT_RESPONSE,
  ALL_ERRORS_VISIBLE,
} from '../constants';
import rootReducer, { INITIAL_PROFILES_STATE } from '../reducers';

describe('reducers', () => {
  let sandbox, store, dispatchThen;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
  });
  afterEach(() => {
    sandbox.restore();

    store = null;
    dispatchThen = null;
  });

  describe('profile reducers', () => {
    let getUserProfileStub, patchUserProfileStub;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.profiles);
      getUserProfileStub = sandbox.stub(api, 'getUserProfile');
      patchUserProfileStub = sandbox.stub(api, 'patchUserProfile');
    });

    it('should have initial state', () => {
      return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
        assert.deepEqual(state, INITIAL_PROFILES_STATE);
      });
    });

    it('should fetch user profile successfully then clear it', () => {
      getUserProfileStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(USER_PROFILE_RESPONSE));

      return dispatchThen(fetchUserProfile('jane'), [REQUEST_GET_USER_PROFILE, RECEIVE_GET_USER_PROFILE_SUCCESS]).
      then(profileState => {
        assert.deepEqual(profileState['jane'].profile, USER_PROFILE_RESPONSE);
        assert.equal(profileState['jane'].getStatus, FETCH_SUCCESS);

        assert.ok(getUserProfileStub.calledWith('jane'));

        return dispatchThen(clearProfile('jane'), [CLEAR_PROFILE]).then(state => {
          assert.deepEqual(state, INITIAL_PROFILES_STATE);
        });
      });
    });

    it('should fail to fetch user profile', () => {
      let errorInfo = {
        errorStatusCode: 404,
        detail: "not found"
      };
      getUserProfileStub.withArgs(SETTINGS.user.username).returns(Promise.reject(errorInfo));

      return dispatchThen(fetchUserProfile('jane'), [REQUEST_GET_USER_PROFILE, RECEIVE_GET_USER_PROFILE_FAILURE]).
      then(profileState => {
        assert.equal(profileState['jane'].getStatus, FETCH_FAILURE);
        assert.deepEqual(profileState['jane'].errorInfo, errorInfo);
        assert.ok(getUserProfileStub.calledWith('jane'));
      });
    });

    it("should patch the profile successfully", () => {
      let updatedProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
        change: true
      });
      patchUserProfileStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(updatedProfile));

      return dispatchThen(
        saveProfile('jane', USER_PROFILE_RESPONSE),
        [REQUEST_PATCH_USER_PROFILE, RECEIVE_PATCH_USER_PROFILE_SUCCESS]
      ).then(profileState => {
        assert.equal(profileState['jane'].patchStatus, FETCH_SUCCESS);
        assert.deepEqual(profileState['jane'].profile, updatedProfile);

        assert.ok(patchUserProfileStub.calledWith('jane', USER_PROFILE_RESPONSE));
      });
    });

    it("should fail to patch the profile", () => {
      let errorInfo = {errorStatusCode: 500};
      patchUserProfileStub.withArgs(SETTINGS.user.username).returns(Promise.reject(errorInfo));

      return dispatchThen(
        saveProfile('jane', USER_PROFILE_RESPONSE),
        [REQUEST_PATCH_USER_PROFILE, RECEIVE_PATCH_USER_PROFILE_FAILURE]
      ).then(profileState => {
        assert.equal(profileState['jane'].patchStatus, FETCH_FAILURE);
        assert.deepEqual(profileState['jane'].errorInfo, errorInfo);
        assert.ok(patchUserProfileStub.calledWith('jane', USER_PROFILE_RESPONSE));
      });
    });

    it("should start editing the profile, update the copy, then clear it", () => {
      // populate a profile
      store.dispatch(receiveGetUserProfileSuccess('jane', _.cloneDeep(USER_PROFILE_RESPONSE)));
      return dispatchThen(startProfileEdit('jane'), [START_PROFILE_EDIT]).then(profileState => {
        assert.deepEqual(profileState['jane'].edit, {
          profile: USER_PROFILE_RESPONSE,
          errors: {},
          visibility: [],
        });

        let newProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          newField: true
        });

        return dispatchThen(updateProfile('jane', newProfile), [UPDATE_PROFILE]).then(profileState => {
          assert.deepEqual(profileState['jane'].edit, {
            profile: newProfile,
            errors: {},
            visibility: [],
          });

          return dispatchThen(clearProfileEdit('jane'), [CLEAR_PROFILE_EDIT]).then(profileState => {
            assert.deepEqual(profileState['jane'].edit, undefined);
          });
        });
      });
    });

    it("should start editing the profile, and validate it", () => {
      // populate a profile
      store.dispatch(receiveGetUserProfileSuccess('jane', USER_PROFILE_RESPONSE));
      store.dispatch(startProfileEdit('jane'));
      store.dispatch(updateValidationVisibility('jane', ALL_ERRORS_VISIBLE));

      let errors = {error: "I am an error"};
      return dispatchThen(updateProfileValidation('jane', errors), [UPDATE_PROFILE_VALIDATION]).then(profileState => {
        assert.deepEqual(profileState['jane'].edit, {
          profile: USER_PROFILE_RESPONSE,
          errors: errors,
          visibility: [ ALL_ERRORS_VISIBLE ],
        });
      });
    });

    it('should validate an existing profile successfully', () => {
      // populate a profile
      store.dispatch(receiveGetUserProfileSuccess('jane', USER_PROFILE_RESPONSE));
      store.dispatch(startProfileEdit('jane'));
      store.dispatch(updateValidationVisibility('jane', ALL_ERRORS_VISIBLE));

      return dispatchThen(
        updateProfileValidation('jane', {}),
        [UPDATE_PROFILE_VALIDATION]
      ).then(profileState => {
        assert.deepEqual(profileState['jane'].edit.errors, {});
      });
    });

    it('should validate an existing profile with validation errors', () => {
      // populate a profile
      store.dispatch(receiveGetUserProfileSuccess('jane', USER_PROFILE_RESPONSE));
      store.dispatch(startProfileEdit('jane'));
      store.dispatch(updateValidationVisibility('jane', ALL_ERRORS_VISIBLE));
      let errors = {
        first_name: "Given name is required"
      };
      return dispatchThen(
        updateProfileValidation('jane', errors),
        [UPDATE_PROFILE_VALIDATION]
      ).then(profileState => {
        assert.deepEqual(profileState['jane'].edit.errors, errors);
      });
    });

    it('should validate a profile with nested objects and errors', () => {
      let errors = {
        work_history: [
          {
            position: 'Position is required'
          }
        ]
      };

      // populate a profile
      store.dispatch(receiveGetUserProfileSuccess('jane', USER_PROFILE_RESPONSE));
      store.dispatch(startProfileEdit('jane'));
      store.dispatch(updateValidationVisibility('jane', ALL_ERRORS_VISIBLE));
      return dispatchThen(
        updateProfileValidation('jane', errors),
        [UPDATE_PROFILE_VALIDATION]
      ).then(profileState => {
        assert.deepEqual(profileState['jane'].edit.errors, errors);
      });
    });


    it("can't edit a profile if we never get it successfully", () => {
      return dispatchThen(startProfileEdit('jane'), [START_PROFILE_EDIT]).then(profileState => {
        assert.deepEqual(profileState['jane'], undefined);
      });
    });

    it("can't edit a profile if edit doesn't exist", () => {
      return dispatchThen(updateProfile('jane', USER_PROFILE_RESPONSE), [UPDATE_PROFILE]).then(profileState => {
        assert.deepEqual(profileState['jane'], undefined);
      });
    });

    it("can't validate a profile's edits if edit doesn't exist", () => {
      return dispatchThen(
        updateProfileValidation('jane', {error: "an error"}),
        [UPDATE_PROFILE_VALIDATION]
      ).then(profileState => {
        assert.deepEqual(profileState['jane'], undefined);
      });
    });
  });

  describe('dashboard reducers', () => {
    let dashboardStub;

    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.dashboard);
      dashboardStub = sandbox.stub(api, 'getDashboard');
    });

    it('should have an empty default state', () => {
      return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
        assert.deepEqual(state, {
          programs: []
        });
      });
    });

    it('should fetch the dashboard successfully then clear it', () => {
      dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE));

      return dispatchThen(fetchDashboard(), [REQUEST_DASHBOARD, RECEIVE_DASHBOARD_SUCCESS]).then(dashboardState => {
        assert.deepEqual(dashboardState.programs, DASHBOARD_RESPONSE);
        assert.equal(dashboardState.fetchStatus, FETCH_SUCCESS);

        return dispatchThen(clearDashboard(), [CLEAR_DASHBOARD]).then(dashboardState => {
          assert.deepEqual(dashboardState, {
            programs: []
          });
        });
      });
    });

    it('should fail to fetch the dashboard', () => {
      dashboardStub.returns(Promise.reject());

      return dispatchThen(fetchDashboard(), [REQUEST_DASHBOARD, RECEIVE_DASHBOARD_FAILURE]).then(dashboardState => {
        assert.equal(dashboardState.fetchStatus, FETCH_FAILURE);
      });
    });

    it("should update a course run's status", () => {
      store.dispatch(receiveDashboardSuccess(DASHBOARD_RESPONSE));

      let getRun = programs => programs[1].courses[0].runs[0];

      let run = getRun(DASHBOARD_RESPONSE);
      assert.notEqual(run.status, 'new_status');
      return dispatchThen(updateCourseStatus(run.course_id, 'new_status'), [UPDATE_COURSE_STATUS]).then(state => {
        assert.equal(getRun(state.programs).status, 'new_status');
      });
    });
  });

  describe('prices reducer', () => {
    let pricesStub;

    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.prices);
      pricesStub = sandbox.stub(api, 'getCoursePrices');
    });

    it('should have an empty default state', () => {
      return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
        assert.deepEqual(state, {
          coursePrices: []
        });
      });
    });

    it('should fetch the prices successfully then clear it', () => {
      pricesStub.returns(Promise.resolve(COURSE_PRICES_RESPONSE));

      return dispatchThen(fetchCoursePrices(), [
        REQUEST_COURSE_PRICES,
        RECEIVE_COURSE_PRICES_SUCCESS,
      ]).then(pricesState => {
        assert.deepEqual(pricesState.coursePrices, COURSE_PRICES_RESPONSE);
        assert.equal(pricesState.fetchStatus, FETCH_SUCCESS);

        return dispatchThen(clearCoursePrices(), [CLEAR_COURSE_PRICES]).then(pricesState => {
          assert.deepEqual(pricesState, {
            coursePrices: []
          });
        });
      });
    });

    it('should fail to fetch the dashboard', () => {
      pricesStub.returns(Promise.reject());

      return dispatchThen(fetchCoursePrices(), [
        REQUEST_COURSE_PRICES,
        RECEIVE_COURSE_PRICES_FAILURE,
      ]).then(pricesState => {
        assert.equal(pricesState.fetchStatus, FETCH_FAILURE);
      });
    });
  });

  describe('checkout reducers', () => {
    let checkoutStub;

    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.checkout);
      checkoutStub = sandbox.stub(api, 'checkout');
    });

    it('should have an empty default state', () => {
      return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
        assert.deepEqual(state, {});
      });
    });

    it('should POST a checkout successfully', () => {
      checkoutStub.returns(Promise.resolve(CYBERSOURCE_CHECKOUT_RESPONSE));

      return dispatchThen(checkout('course_id'), [REQUEST_CHECKOUT, RECEIVE_CHECKOUT_SUCCESS]).then(checkoutState => {
        assert.equal(checkoutState.fetchStatus, FETCH_SUCCESS);
        assert.equal(checkoutStub.callCount, 1);
        assert.deepEqual(checkoutStub.args[0], ['course_id']);
      });
    });

    it('should fail to checkout if API call fails', () => {
      checkoutStub.returns(Promise.reject());

      return dispatchThen(checkout('course_id'), [REQUEST_CHECKOUT, RECEIVE_CHECKOUT_FAILURE]).then(checkoutState => {
        assert.equal(checkoutState.fetchStatus, FETCH_FAILURE);
        assert.equal(checkoutStub.callCount, 1);
        assert.deepEqual(checkoutStub.args[0], ['course_id']);
      });
    });
  });
});
