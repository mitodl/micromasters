// @flow
import {
  requestGetProgramEnrollments,
  receiveGetProgramEnrollmentsSuccess,
  receiveGetProgramEnrollmentsFailure,
  requestAddProgramEnrollment,
  receiveAddProgramEnrollmentSuccess,
  receiveAddProgramEnrollmentFailure,
  clearEnrollments,
  setCurrentProgramEnrollment,

  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
  CLEAR_ENROLLMENTS,
  SET_CURRENT_PROGRAM_ENROLLMENT,
} from './enrollments';
import { assertCreatedActionHelper } from './util';

describe('enrollment actions', () => {
  it('should create all action creators', () => {
    [
      [requestGetProgramEnrollments, REQUEST_GET_PROGRAM_ENROLLMENTS],
      [receiveGetProgramEnrollmentsSuccess, RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS],
      [receiveGetProgramEnrollmentsFailure, RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE],
      [requestAddProgramEnrollment, REQUEST_ADD_PROGRAM_ENROLLMENT],
      [receiveAddProgramEnrollmentSuccess, RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS],
      [receiveAddProgramEnrollmentFailure, RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE],
      [clearEnrollments, CLEAR_ENROLLMENTS],
      [setCurrentProgramEnrollment, SET_CURRENT_PROGRAM_ENROLLMENT],
    ].forEach(assertCreatedActionHelper);
  });
});
