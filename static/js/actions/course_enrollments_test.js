// @flow
import {
  requestAddCourseEnrollment,
  receiveAddCourseEnrollmentSuccess,
  receiveAddCourseEnrollmentFailure,

  REQUEST_ADD_COURSE_ENROLLMENT,
  RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE,
} from './course_enrollments';
import { assertCreatedActionHelper } from './util';

describe('course enrollment actions', () => {
  it('should create all action creators', () => {
    [
      [requestAddCourseEnrollment, REQUEST_ADD_COURSE_ENROLLMENT],
      [receiveAddCourseEnrollmentSuccess, RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS],
      [receiveAddCourseEnrollmentFailure, RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE],
    ].forEach(assertCreatedActionHelper);
  });
});
