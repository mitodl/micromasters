// @flow
import { assert } from 'chai';

import {
  requestGetProgramEnrollments,
  receiveGetProgramEnrollmentsSuccess,
  receiveGetProgramEnrollmentsFailure,
  requestAddProgramEnrollment,
  receiveAddProgramEnrollmentSuccess,
  receiveAddProgramEnrollmentFailure,
  clearEnrollments,

  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
  CLEAR_ENROLLMENTS,
} from './enrollments';

describe('enrollment actions', () => {
  describe('enrollment action helpers', () => {
    const assertCreatedActionHelper = ([actionHelper, actionType]) => {
      it(`should create the ${actionType} simple action helper correctly`, () => {
        assert.deepEqual(actionHelper(), {type: actionType});
      });

      it(`should create the ${actionType} action helper with args correctly`, () => {
        assert.deepEqual(actionHelper({foo: "bar"}), { type: actionType, payload: { foo: "bar" } });
      });
    };

    [
      [requestGetProgramEnrollments, REQUEST_GET_PROGRAM_ENROLLMENTS],
      [receiveGetProgramEnrollmentsSuccess, RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS],
      [receiveGetProgramEnrollmentsFailure, RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE],
      [requestAddProgramEnrollment, REQUEST_ADD_PROGRAM_ENROLLMENT],
      [receiveAddProgramEnrollmentSuccess, RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS],
      [receiveAddProgramEnrollmentFailure, RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE],
      [clearEnrollments, CLEAR_ENROLLMENTS],
    ].forEach(assertCreatedActionHelper);
  });
});
