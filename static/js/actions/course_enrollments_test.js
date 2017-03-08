// @flow
import { assert } from 'chai';
import configureTestStore from 'redux-asserts';

import {
  requestAddCourseEnrollment,
  receiveAddCourseEnrollmentSuccess,
  receiveAddCourseEnrollmentFailure,
  showEnrollPayLaterSuccessMessage,

  REQUEST_ADD_COURSE_ENROLLMENT,
  RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE,
} from './course_enrollments';
import { assertCreatedActionHelper } from './test_util';
import {
  showEnrollPayLaterSuccess,

  SHOW_ENROLL_PAY_LATER_SUCCESS
} from './ui';
import rootReducer from '../reducers';

describe('course enrollment actions', () => {
  it('should create all action creators', () => {
    [
      [requestAddCourseEnrollment, REQUEST_ADD_COURSE_ENROLLMENT],
      [receiveAddCourseEnrollmentSuccess, RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS],
      [receiveAddCourseEnrollmentFailure, RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE],
    ].forEach(assertCreatedActionHelper);
  });
});

describe('show and hide enroll pay later success alert', () => {
  let store, dispatchThen;

  beforeEach(() => {
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.ui);
  });

  it('should set and reset enroll pay later dialog', () => {
    return dispatchThen(
      showEnrollPayLaterSuccessMessage('foo/bar/baz'),
      [SHOW_ENROLL_PAY_LATER_SUCCESS]
    ).then((state) => {
      assert.equal(state.showEnrollPayLaterSuccess, 'foo/bar/baz');
      return dispatchThen(
        showEnrollPayLaterSuccess(null),
        [SHOW_ENROLL_PAY_LATER_SUCCESS]
      ).then((state) => {
        assert.deepEqual(state.showEnrollPayLaterSuccess, null);
      });
    });
  });
});
