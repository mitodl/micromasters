// @flow
/* global SETTINGS: false */
import { combineReducers } from 'redux';
import _ from 'lodash';

import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  RECEIVE_GET_USER_PROFILE_FAILURE,
  CLEAR_PROFILE,
  UPDATE_PROFILE,
  START_PROFILE_EDIT,
  CLEAR_PROFILE_EDIT,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  RECEIVE_PATCH_USER_PROFILE_FAILURE,
  UPDATE_PROFILE_VALIDATION,
} from '../actions/profile';
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
  CLEAR_DASHBOARD,

  REQUEST_CHECKOUT,
  RECEIVE_CHECKOUT_SUCCESS,
  RECEIVE_CHECKOUT_FAILURE,

  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
  RECEIVE_COURSE_PRICES_FAILURE,
  CLEAR_COURSE_PRICES,
  UPDATE_COURSE_STATUS,

  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import { ui } from './ui';
import { email } from './email';
import {
  currentProgramEnrollment,
  enrollments,
} from './enrollments';
import type { DashboardState, CoursePricesState } from '../flow/dashboardTypes';
import type { Action } from '../flow/reduxTypes';
import type {
  ProfileGetResult,
  Profiles,
} from '../flow/profileTypes';
import { signupDialog } from './signup_dialog';
import { imageUpload } from './image_upload';
import { financialAid } from './financial_aid';
import { documents } from './documents';
import { orderReceipt } from './order_receipt';

export const INITIAL_PROFILES_STATE = {};
export const profiles = (state: Profiles = INITIAL_PROFILES_STATE, action: Action) => {
  let patchProfile = newProfile => {
    let clone = Object.assign({}, state);
    let username = action.payload.username;
    clone[username] = Object.assign(
      { profile: {} },
      clone[username],
      newProfile
    );
    return clone;
  };

  let getProfile = (): ProfileGetResult|void => {
    if (state[action.payload.username] !== undefined) {
      return state[action.payload.username];
    }
  };
  let profile;

  switch (action.type) {
  case REQUEST_GET_USER_PROFILE:
    return patchProfile({
      getStatus: FETCH_PROCESSING
    });
  case RECEIVE_GET_USER_PROFILE_SUCCESS:
    return patchProfile({
      getStatus: FETCH_SUCCESS,
      profile: action.payload.profile
    });
  case RECEIVE_GET_USER_PROFILE_FAILURE:
    return patchProfile({
      getStatus: FETCH_FAILURE,
      errorInfo: action.payload.errorInfo
    });
  case CLEAR_PROFILE: {
    let clone = Object.assign({}, state);
    delete clone[action.payload.username];
    return clone;
  }
  case UPDATE_PROFILE:
    profile = getProfile();
    if (profile === undefined || profile.edit === undefined) {
      // caller must have dispatched START_PROFILE_EDIT successfully first
      return state;
    }
    return patchProfile({
      edit: Object.assign({}, profile.edit, {
        profile: action.payload.profile
      })
    });
  case START_PROFILE_EDIT:
    profile = getProfile();
    if (profile === undefined || profile.getStatus !== FETCH_SUCCESS) {
      // ignore attempts to edit if we don't have a valid profile to edit yet
      return state;
    }
    return patchProfile({
      edit: {
        profile: profile.profile,
        errors: {}
      }
    });
  case CLEAR_PROFILE_EDIT:
    return patchProfile({
      edit: undefined
    });
  case REQUEST_PATCH_USER_PROFILE:
    return patchProfile({
      patchStatus: FETCH_PROCESSING
    });
  case RECEIVE_PATCH_USER_PROFILE_SUCCESS:
    return patchProfile({
      patchStatus: FETCH_SUCCESS,
      profile: action.payload.profile
    });
  case RECEIVE_PATCH_USER_PROFILE_FAILURE:
    return patchProfile({
      patchStatus: FETCH_FAILURE,
      errorInfo: action.payload.errorInfo
    });
  case UPDATE_PROFILE_VALIDATION:
    profile = getProfile();
    if (profile === undefined || profile.edit === undefined) {
      // caller must have dispatched START_PROFILE_EDIT successfully first
      return state;
    } else {
      return patchProfile({
        edit: Object.assign({}, profile.edit, {
          errors: action.payload.errors
        })
      });
    }
  default:
    return state;
  }
};

const INITIAL_DASHBOARD_STATE: DashboardState = {
  programs: []
};

export const dashboard = (state: DashboardState = INITIAL_DASHBOARD_STATE, action: Action) => {
  switch (action.type) {
  case REQUEST_DASHBOARD:
    if (action.payload.noSpinner) {
      return state;
    } else {
      return Object.assign({}, state, {
        fetchStatus: FETCH_PROCESSING
      });
    }
  case RECEIVE_DASHBOARD_SUCCESS:
    return Object.assign({}, state, {
      fetchStatus: FETCH_SUCCESS,
      programs: action.payload.programs
    });
  case RECEIVE_DASHBOARD_FAILURE:
    return Object.assign({}, state, {
      fetchStatus: FETCH_FAILURE,
      errorInfo: action.payload.errorInfo
    });
  case UPDATE_COURSE_STATUS: {
    const { courseId, status } = action.payload;
    let programs = _.cloneDeep(state.programs);
    for (let program of programs) {
      for (let course of program.courses) {
        for (let courseRun of course.runs) {
          if (courseRun.course_id === courseId) {
            courseRun.status = status;
          }
        }
      }
    }
    return Object.assign({}, state, { programs });
  }
  case CLEAR_DASHBOARD:
    return INITIAL_DASHBOARD_STATE;
  default:
    return state;
  }
};

type CheckoutState = {
  fetchStatus?: string,
};
const INITIAL_CHECKOUT_STATE = {};
export const checkout = (state: CheckoutState = INITIAL_CHECKOUT_STATE, action: Action) => {
  switch (action.type) {
  case REQUEST_CHECKOUT:
    return Object.assign({}, state, {
      fetchStatus: FETCH_PROCESSING
    });
  case RECEIVE_CHECKOUT_SUCCESS:
    return Object.assign({}, state, {
      fetchStatus: FETCH_SUCCESS
    });
  case RECEIVE_CHECKOUT_FAILURE:
    return Object.assign({}, state, {
      fetchStatus: FETCH_FAILURE
    });
  default:
    return state;
  }
};

const INITIAL_COURSE_PRICES_STATE: CoursePricesState = {
  coursePrices: []
};
export const prices = (state: CoursePricesState = INITIAL_COURSE_PRICES_STATE, action: Action) => {
  switch (action.type) {
  case REQUEST_COURSE_PRICES:
    return Object.assign({}, state, {
      fetchStatus: FETCH_PROCESSING
    });
  case RECEIVE_COURSE_PRICES_SUCCESS:
    return Object.assign({}, state, {
      fetchStatus: FETCH_SUCCESS,
      coursePrices: action.payload
    });
  case RECEIVE_COURSE_PRICES_FAILURE:
    return Object.assign({}, state, {
      fetchStatus: FETCH_FAILURE,
      errorInfo: action.payload
    });
  case CLEAR_COURSE_PRICES:
    return INITIAL_COURSE_PRICES_STATE;
  default:
    return state;
  }
};

export default combineReducers({
  profiles,
  dashboard,
  ui,
  email,
  checkout,
  prices,
  enrollments,
  currentProgramEnrollment,
  signupDialog,
  imageUpload,
  financialAid,
  documents,
  orderReceipt,
});
