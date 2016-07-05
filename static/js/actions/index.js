import * as api from '../util/api';

// user profile actions
export const REQUEST_GET_USER_PROFILE = 'REQUEST_GET_USER_PROFILE';
export const RECEIVE_GET_USER_PROFILE_SUCCESS = 'RECEIVE_GET_USER_PROFILE_SUCCESS';
export const RECEIVE_GET_USER_PROFILE_FAILURE = 'RECEIVE_GET_USER_PROFILE_FAILURE';
export const CLEAR_PROFILE = 'CLEAR_PROFILE';
export const UPDATE_PROFILE = 'UPDATE_PROFILE';
export const START_PROFILE_EDIT = 'START_PROFILE_EDIT';
export const CLEAR_PROFILE_EDIT = 'CLEAR_PROFILE_EDIT';
export const REQUEST_PATCH_USER_PROFILE = 'REQUEST_PATCH_USER_PROFILE';
export const RECEIVE_PATCH_USER_PROFILE_SUCCESS = 'RECEIVE_PATCH_USER_PROFILE_SUCCESS';
export const RECEIVE_PATCH_USER_PROFILE_FAILURE = 'RECEIVE_PATCH_USER_PROFILE_FAILURE';
export const UPDATE_PROFILE_VALIDATION = 'UPDATE_PROFILE_VALIDATION';

// constants for fetch status (these are not action types)
export const FETCH_FAILURE = 'FETCH_FAILURE';
export const FETCH_SUCCESS = 'FETCH_SUCCESS';
export const FETCH_PROCESSING = 'FETCH_PROCESSING';

// actions for user profile
const requestGetUserProfile = username => ({
  type: REQUEST_GET_USER_PROFILE,
  payload: { username }
});

export const receiveGetUserProfileSuccess = (username, profile) => ({
  type: RECEIVE_GET_USER_PROFILE_SUCCESS,
  payload: { profile, username }
});

const receiveGetUserProfileFailure = (username, errorInfo) => ({
  type: RECEIVE_GET_USER_PROFILE_FAILURE,
  payload: { username, errorInfo }
});

export const clearProfile = username => ({
  type: CLEAR_PROFILE,
  payload: { username }
});

export const updateProfile = (username, profile) => ({
  type: UPDATE_PROFILE,
  payload: { profile, username }
});

export const startProfileEdit = username => ({
  type: START_PROFILE_EDIT,
  payload: { username }
});
export const clearProfileEdit = username => ({
  type: CLEAR_PROFILE_EDIT,
  payload: { username }
});

const requestPatchUserProfile = username => ({
  type: REQUEST_PATCH_USER_PROFILE,
  payload: { username }
});

const receivePatchUserProfileSuccess = (username, profile) => ({
  type: RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  payload: { profile, username }
});

const receivePatchUserProfileFailure = (username, errorInfo) => ({
  type: RECEIVE_PATCH_USER_PROFILE_FAILURE,
  payload: { username, errorInfo }
});

export const saveProfile = (username, profile) => {
  return dispatch => {
    dispatch(requestPatchUserProfile(username));
    return api.patchUserProfile(username, profile).
      then(newProfile => dispatch(receivePatchUserProfileSuccess(username, newProfile))).
      catch(error => {
        dispatch(receivePatchUserProfileFailure(username, error));
        // the exception is assumed handled and will not be propagated
      });
  };
};
export const updateProfileValidation = (username, errors) => ({
  type: UPDATE_PROFILE_VALIDATION,
  payload: { errors, username }
});

export function fetchUserProfile(username) {
  return dispatch => {
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
export const RECEIVE_DASHBOARD_SUCCESS = 'RECEIVE_DASHBOARD_SUCCESS';
export const RECEIVE_DASHBOARD_FAILURE = 'RECEIVE_DASHBOARD_FAILURE';
export const CLEAR_DASHBOARD = 'CLEAR_DASHBOARD';

const requestDashboard = () => ({ type: REQUEST_DASHBOARD });
export const receiveDashboardSuccess = programs => ({
  type: RECEIVE_DASHBOARD_SUCCESS,
  payload: { programs }
});
export const receiveDashboardFailure = errorInfo => ({
  type: RECEIVE_DASHBOARD_FAILURE,
  payload: { errorInfo }
});
export const clearDashboard = () => ({ type: CLEAR_DASHBOARD });

export function fetchDashboard() {
  return dispatch => {
    dispatch(requestDashboard());
    return api.getDashboard().
      then(dashboard => dispatch(receiveDashboardSuccess(dashboard))).
      catch(error => {
        dispatch(receiveDashboardFailure(error));
        // the exception is assumed handled and will not be propagated
      });
  };
}
