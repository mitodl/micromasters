/* global SETTINGS: false */
import {
  fetchUserProfile,
  receiveGetUserProfileSuccess,
  clearProfile,
  saveProfile,
  updateProfile,
  updateProfileValidation,
  startProfileEdit,
  clearProfileEdit,
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

  fetchDashboard,
  clearDashboard,
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
  CLEAR_DASHBOARD,

  FETCH_FAILURE,
  FETCH_SUCCESS
} from '../actions/index';
import * as api from '../util/api';
import {
  DASHBOARD_RESPONSE,
  USER_PROFILE_RESPONSE,
} from '../constants';
import configureTestStore from 'redux-asserts';
import rootReducer, { INITIAL_PROFILES_STATE } from '../reducers';
import { assert } from 'chai';
import sinon from 'sinon';

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
      getUserProfileStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));

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
      getUserProfileStub.returns(Promise.reject(errorInfo));

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
      patchUserProfileStub.returns(Promise.resolve(updatedProfile));

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
      patchUserProfileStub.returns(Promise.reject(errorInfo));

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
      store.dispatch(receiveGetUserProfileSuccess('jane', USER_PROFILE_RESPONSE));
      return dispatchThen(startProfileEdit('jane'), [START_PROFILE_EDIT]).then(profileState => {
        assert.deepEqual(profileState['jane'].edit, {
          profile: USER_PROFILE_RESPONSE,
          errors: {}
        });

        let newProfile = Object.assign({}, USER_PROFILE_RESPONSE, {
          newField: true
        });

        return dispatchThen(updateProfile('jane', newProfile), [UPDATE_PROFILE]).then(profileState => {
          assert.deepEqual(profileState['jane'].edit, {
            profile: newProfile,
            errors: {}
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

      let errors = {error: "I am an error"};
      return dispatchThen(updateProfileValidation('jane', errors), [UPDATE_PROFILE_VALIDATION]).then(profileState => {
        assert.deepEqual(profileState['jane'].edit, {
          profile: USER_PROFILE_RESPONSE,
          errors: errors
        });
      });
    });

    it('should validate an existing profile successfully', () => {
      // populate a profile
      store.dispatch(receiveGetUserProfileSuccess('jane', USER_PROFILE_RESPONSE));
      store.dispatch(startProfileEdit('jane'));

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
  });
});
