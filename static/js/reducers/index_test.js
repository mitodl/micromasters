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
  checkout,
  REQUEST_CHECKOUT,
  RECEIVE_CHECKOUT_SUCCESS,
  RECEIVE_CHECKOUT_FAILURE,
  FETCH_FAILURE,
  FETCH_SUCCESS
} from '../actions';

import * as api from '../lib/api';
import {
  USER_PROFILE_RESPONSE,
  CYBERSOURCE_CHECKOUT_RESPONSE,
} from '../test_constants';
import { ALL_ERRORS_VISIBLE } from '../constants';
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
      let updatedProfile = {
        ...USER_PROFILE_RESPONSE,
        change: true,
      };
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

        let newProfile = {
          ...USER_PROFILE_RESPONSE,
          newField: true,
        };

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
