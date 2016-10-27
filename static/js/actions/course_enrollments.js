// @flow
import type { Dispatch } from 'redux';
import { createAction } from 'redux-actions';

import {
  fetchCoursePrices,
  fetchDashboard,
} from './';
import type { Dispatcher } from '../flow/reduxTypes';
import * as api from '../lib/api';

export const REQUEST_ADD_COURSE_ENROLLMENT = 'REQUEST_ADD_COURSE_ENROLLMENT';
export const requestAddCourseEnrollment = createAction(REQUEST_ADD_COURSE_ENROLLMENT);

export const RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS = 'RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS';
export const receiveAddCourseEnrollmentSuccess = createAction(RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS);

export const RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE = 'RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE';
export const receiveAddCourseEnrollmentFailure = createAction(RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE);

export const addCourseEnrollment = (courseId: string): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(requestAddCourseEnrollment(courseId));
    return api.addCourseEnrollment(courseId).
      then(() => {
        dispatch(receiveAddCourseEnrollmentSuccess());
        dispatch(fetchDashboard());
        dispatch(fetchCoursePrices());
      }).
      catch(() => {
        dispatch(receiveAddCourseEnrollmentFailure());
      });
  };
};
