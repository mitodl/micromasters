// @flow
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
  CLEAR_ENROLLMENTS,
} from '../actions/enrollments';
import {
  FETCH_FAILURE,
  FETCH_SUCCESS,
  FETCH_PROCESSING
} from '../actions';
import type { Action } from '../flow/reduxTypes';
import type {
  ProgramEnrollmentsState,
} from '../flow/enrollmentTypes';

export const INITIAL_ENROLLMENTS_STATE: ProgramEnrollmentsState = {
  programEnrollments: []
};

export const enrollments = (state: ProgramEnrollmentsState = INITIAL_ENROLLMENTS_STATE, action: Action) => {
  switch (action.type) {
  case REQUEST_GET_PROGRAM_ENROLLMENTS:
    return { ...state, getStatus: FETCH_PROCESSING };
  case RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS:
    return { ...state, getStatus: FETCH_SUCCESS, programEnrollments: action.payload };
  case RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE:
    return { ...state, getStatus: FETCH_FAILURE, getErrorInfo: action.payload };
  case REQUEST_ADD_PROGRAM_ENROLLMENT:
    return { ...state, postStatus: FETCH_PROCESSING };
  case RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS:
    return {
      ...state,
      postStatus: FETCH_SUCCESS,
      programEnrollments: state.programEnrollments.concat(action.payload)
    };
  case RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE:
    return { ...state, postStatus: FETCH_FAILURE, postErrorInfo: action.payload };
  case CLEAR_ENROLLMENTS:
    return INITIAL_ENROLLMENTS_STATE;
  default:
    return state;
  }
};
