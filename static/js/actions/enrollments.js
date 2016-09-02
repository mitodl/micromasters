// @flow
import type { Dispatch } from 'redux';

import type { Dispatcher } from '../flow/reduxTypes';
import type {
  ProgramEnrollment,
  ProgramEnrollments,
} from '../flow/enrollmentTypes';
import * as api from '../util/api';
import { actionCreatorGenerator } from './util';


export const REQUEST_GET_PROGRAM_ENROLLMENTS = 'REQUEST_GET_PROGRAM_ENROLLMENTS';
export const requestGetProgramEnrollments = actionCreatorGenerator(REQUEST_GET_PROGRAM_ENROLLMENTS);

export const RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS = 'RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS';
export const receiveGetProgramEnrollmentsSuccess = actionCreatorGenerator(RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS);

export const RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE = 'RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE';
export const receiveGetProgramEnrollmentsFailure = actionCreatorGenerator(RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE);

export function fetchProgramEnrollments(): Dispatcher<ProgramEnrollments> {
  return (dispatch: Dispatch) => {
    dispatch(requestGetProgramEnrollments());
    return api.getProgramEnrollments().
      then(enrollments => dispatch(receiveGetProgramEnrollmentsSuccess(enrollments))).
      catch(error => {
        dispatch(receiveGetProgramEnrollmentsFailure(error));
        // the exception is assumed handled and will not be propagated
      });
  };
}

export const REQUEST_ADD_PROGRAM_ENROLLMENT = 'REQUEST_ADD_PROGRAM_ENROLLMENT';
export const requestAddProgramEnrollment = actionCreatorGenerator(REQUEST_ADD_PROGRAM_ENROLLMENT);

export const RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS = 'RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS';
export const receiveAddProgramEnrollmentSuccess = actionCreatorGenerator(RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS);

export const RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE = 'RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE';
export const receiveAddProgramEnrollmentFailure = actionCreatorGenerator(RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE);

export const addProgramEnrollment = (programId: number): Dispatcher<ProgramEnrollment> => {
  return (dispatch: Dispatch) => {
    dispatch(requestAddProgramEnrollment(programId));
    return api.addProgramEnrollment(programId).
      then(enrollment => dispatch(receiveAddProgramEnrollmentSuccess(enrollment))).
      catch(error => {
        dispatch(receiveAddProgramEnrollmentFailure(error));
        // the exception is assumed handled and will not be propagated
      });
  };
};

export const CLEAR_ENROLLMENTS = 'CLEAR_ENROLLMENTS';
export const clearEnrollments = actionCreatorGenerator(CLEAR_ENROLLMENTS);
