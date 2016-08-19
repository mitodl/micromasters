// @flow
import type { Dispatch } from 'redux';

import * as api from '../util/api';
import type {
  APIErrorInfo,
  ProfileGetResult,
  Profile,
  ValidationErrors,
} from '../flow/profileTypes';
import type { Action, Dispatcher } from '../flow/reduxTypes';

// constants for fetch status (these are not action types)
export const FETCH_FAILURE = 'FETCH_FAILURE';
export const FETCH_SUCCESS = 'FETCH_SUCCESS';
export const FETCH_PROCESSING = 'FETCH_PROCESSING';

// actions for user profile
export const REQUEST_GET_USER_PROFILE = 'REQUEST_GET_USER_PROFILE';
const requestGetUserProfile = (username: string): Action => ({
  type: REQUEST_GET_USER_PROFILE,
  payload: { username }
});

export const RECEIVE_GET_USER_PROFILE_SUCCESS = 'RECEIVE_GET_USER_PROFILE_SUCCESS';
export const receiveGetUserProfileSuccess = (username: string, profile: ProfileGetResult) => ({
  type: RECEIVE_GET_USER_PROFILE_SUCCESS,
  payload: { profile, username }
});

export const RECEIVE_GET_USER_PROFILE_FAILURE = 'RECEIVE_GET_USER_PROFILE_FAILURE';
const receiveGetUserProfileFailure = (username: string, errorInfo: APIErrorInfo): Action => ({
  type: RECEIVE_GET_USER_PROFILE_FAILURE,
  payload: { username, errorInfo }
});

export const CLEAR_PROFILE = 'CLEAR_PROFILE';
export const clearProfile = (username: string): Action => ({
  type: CLEAR_PROFILE,
  payload: { username }
});

export const UPDATE_PROFILE = 'UPDATE_PROFILE';
export const updateProfile = (username: string, profile: Profile): Action => ({
  type: UPDATE_PROFILE,
  payload: { profile, username }
});

export const START_PROFILE_EDIT = 'START_PROFILE_EDIT';
export const startProfileEdit = (username: string): Action => ({
  type: START_PROFILE_EDIT,
  payload: { username }
});

export const CLEAR_PROFILE_EDIT = 'CLEAR_PROFILE_EDIT';
export const clearProfileEdit = (username: string): Action => ({
  type: CLEAR_PROFILE_EDIT,
  payload: { username }
});

export const REQUEST_PATCH_USER_PROFILE = 'REQUEST_PATCH_USER_PROFILE';
const requestPatchUserProfile = (username: string): Action => ({
  type: REQUEST_PATCH_USER_PROFILE,
  payload: { username }
});

export const RECEIVE_PATCH_USER_PROFILE_SUCCESS = 'RECEIVE_PATCH_USER_PROFILE_SUCCESS';
const receivePatchUserProfileSuccess = (username: string, profile: ProfileGetResult): Action => ({
  type: RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  payload: { profile, username }
});

export const RECEIVE_PATCH_USER_PROFILE_FAILURE = 'RECEIVE_PATCH_USER_PROFILE_FAILURE';
const receivePatchUserProfileFailure = (username: string, errorInfo: APIErrorInfo): Action => ({
  type: RECEIVE_PATCH_USER_PROFILE_FAILURE,
  payload: { username, errorInfo }
});

export const saveProfile = (username: string, profile: Profile): Dispatcher => {
  return (dispatch: Dispatch) => {
    dispatch(requestPatchUserProfile(username));
    return api.patchUserProfile(username, profile).
      then(newProfile => dispatch(receivePatchUserProfileSuccess(username, newProfile))).
      catch(error => {
        dispatch(receivePatchUserProfileFailure(username, error));
        // the exception is assumed handled and will not be propagated
      });
  };
};

export const UPDATE_PROFILE_VALIDATION = 'UPDATE_PROFILE_VALIDATION';
export const updateProfileValidation = (username: string, errors: ValidationErrors): Action => ({
  type: UPDATE_PROFILE_VALIDATION,
  payload: { errors, username }
});

export function fetchUserProfile(username: string): Dispatcher {
  return (dispatch: Dispatch) => {
    dispatch(requestGetUserProfile(username));
    return api.getUserProfile(username).
      then(json => dispatch(receiveGetUserProfileSuccess(username, json))).
      catch(error => {
        dispatch(receiveGetUserProfileFailure(username, error));
        // the exception is assumed handled and will not be propagated
      });
  };
}

// dashboard list actions
export const REQUEST_DASHBOARD = 'REQUEST_DASHBOARD';
const requestDashboard = () => ({ type: REQUEST_DASHBOARD });

export const RECEIVE_DASHBOARD_SUCCESS = 'RECEIVE_DASHBOARD_SUCCESS';
export const receiveDashboardSuccess = (programs: Object[]): Action => ({
  type: RECEIVE_DASHBOARD_SUCCESS,
  payload: { programs }
});

export const RECEIVE_DASHBOARD_FAILURE = 'RECEIVE_DASHBOARD_FAILURE';
export const receiveDashboardFailure = (errorInfo: APIErrorInfo): Action => ({
  type: RECEIVE_DASHBOARD_FAILURE,
  payload: { errorInfo }
});

export const CLEAR_DASHBOARD = 'CLEAR_DASHBOARD';
export const clearDashboard = () => ({ type: CLEAR_DASHBOARD });

export function fetchDashboard(): Dispatcher {
  return (dispatch: Dispatch) => {
    dispatch(requestDashboard());
    return api.getDashboard().
      then(dashboard => dispatch(receiveDashboardSuccess(dashboard))).
      catch(error => {
        dispatch(receiveDashboardFailure(error));
        // the exception is assumed handled and will not be propagated
      });
  };
}

export const REQUEST_CHECKOUT = 'REQUEST_CHECKOUT';
export const requestCheckout = (courseId: string) => ({
  type: REQUEST_CHECKOUT,
  payload: { courseId }
});

export function checkout(courseId: string): Dispatcher {
  return (dispatch: Dispatch) => {
    dispatch(requestCheckout(courseId));
    return api.checkout(courseId).
      then(response => {
        const {url, payload} = response;
        dispatch(receiveCheckoutSuccess(url, payload));
        return Promise.resolve(response);
      }).catch(error => {
        dispatch(receiveCheckoutFailure(error));
      });
  };
}

export const RECEIVE_CHECKOUT_SUCCESS = 'RECEIVE_CHECKOUT_SUCCESS';
export const receiveCheckoutSuccess = (url: string, payload: Object): Action => ({
  type: RECEIVE_CHECKOUT_SUCCESS,
  payload: { url, payload }
});
export const RECEIVE_CHECKOUT_FAILURE = 'RECEIVE_CHECKOUT_FAILURE';
export const receiveCheckoutFailure = (errorInfo: APIErrorInfo): Action => ({
  type: RECEIVE_CHECKOUT_FAILURE,
  payload: { errorInfo }
});
