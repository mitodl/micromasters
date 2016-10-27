// @flow
import {
  REQUEST_ADD_COURSE_ENROLLMENT,
  RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE,
} from '../actions/course_enrollments';
import {
  FETCH_FAILURE,
  FETCH_SUCCESS,
  FETCH_PROCESSING
} from '../actions';
import type { Action } from '../flow/reduxTypes';
import type {
  CourseEnrollmentsState,
} from '../flow/enrollmentTypes';

export const INITIAL_ENROLLMENTS_STATE: CourseEnrollmentsState = {};

export const courseEnrollments = (state: CourseEnrollmentsState = INITIAL_ENROLLMENTS_STATE, action: Action) => {
  switch (action.type) {
  case REQUEST_ADD_COURSE_ENROLLMENT:
    return { ...state, courseEnrollAddStatus: FETCH_PROCESSING };
  case RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS:
    return { ...state, courseEnrollAddStatus: FETCH_SUCCESS };
  case RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE:
    return { ...state, courseEnrollAddStatus: FETCH_FAILURE };
  default:
    return state;
  }
};
