// @flow
import _ from 'lodash';

import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
  CLEAR_ENROLLMENTS,
  SET_CURRENT_PROGRAM_ENROLLMENT,
} from '../actions/programs';
import {
  FETCH_FAILURE,
  FETCH_SUCCESS,
  FETCH_PROCESSING
} from '../actions';
import type { Action } from '../flow/reduxTypes';
import type {
  AvailableProgramsState,
} from '../flow/enrollmentTypes';

export const INITIAL_PROGRAMS_STATE: AvailableProgramsState = {
  availablePrograms: []
};

export const programs = (state: AvailableProgramsState = INITIAL_PROGRAMS_STATE, action: Action) => {
  switch (action.type) {
  case REQUEST_GET_PROGRAM_ENROLLMENTS:
    return { ...state, getStatus: FETCH_PROCESSING };
  case RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS:
    return { ...state, getStatus: FETCH_SUCCESS, availablePrograms: action.payload };
  case RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE:
    return { ...state, getStatus: FETCH_FAILURE, getErrorInfo: action.payload };
  case REQUEST_ADD_PROGRAM_ENROLLMENT:
    return { ...state, postStatus: FETCH_PROCESSING };
  case RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS:
    return {
      ...state,
      postStatus: FETCH_SUCCESS,
      availablePrograms: state.availablePrograms.filter(
        // filter out old copy of program first
        program => program.id !== action.payload.id
      ).concat(action.payload)
    };
  case RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE:
    return { ...state, postStatus: FETCH_FAILURE, postErrorInfo: action.payload };
  case CLEAR_ENROLLMENTS:
    return INITIAL_PROGRAMS_STATE;
  default:
    return state;
  }
};

// state is of type ProgramEnrollment but I can't convince flow that we do all necessary null checks
export const currentProgramEnrollment = (state: any = null, action: Action) => {
  switch (action.type) {
  case SET_CURRENT_PROGRAM_ENROLLMENT:
    return action.payload;
  case RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS:
    if (!_.isNil(state)) {
      let enrollment = action.payload.find(enrollment => (
        enrollment.id === state.id && enrollment.enrolled
      ));
      if (enrollment === undefined) {
        // current enrollment not found in list
        state = null;
      }
    }
    if (_.isNil(state) && action.payload.length > 0) {
      // no current enrollment selected, pick first from list if there are any
      state = action.payload[0];
    }
    return state;
  case RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS:
    return action.payload;
  default:
    return state;
  }
};
