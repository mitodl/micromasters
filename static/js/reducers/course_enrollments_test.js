import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';

import {
  FETCH_SUCCESS,
  FETCH_FAILURE,
} from '../actions';
import {
  addCourseEnrollment,

  REQUEST_ADD_COURSE_ENROLLMENT,
  RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE,
} from '../actions/course_enrollments';
import * as api from '../lib/api';
import * as actions from '../actions';
import rootReducer from '../reducers';

describe('enrollments', () => {
  let sandbox, store, addCourseEnrollmentStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    addCourseEnrollmentStub = sandbox.stub(api, 'addCourseEnrollment');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('enrollments reducer', () => {
    let dispatchThen, fetchCoursePricesStub, fetchDashboardStub;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.courseEnrollments);

      fetchCoursePricesStub = sandbox.stub(actions, 'fetchCoursePrices');
      fetchCoursePricesStub.returns({type: "fake"});
      fetchDashboardStub = sandbox.stub(actions, 'fetchDashboard');
      fetchDashboardStub.returns({type: "fake"});
    });

    it('should have an empty default state', () => {
      return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
        assert.deepEqual(state, {});
      });
    });

    it('should add a course enrollment successfully', () => {
      addCourseEnrollmentStub.returns(Promise.resolve());

      let courseKey = 'course_key';
      return dispatchThen(addCourseEnrollment(courseKey), [
        REQUEST_ADD_COURSE_ENROLLMENT,
        RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS,
      ]).then(state => {
        assert.equal(state.courseEnrollAddStatus, FETCH_SUCCESS);
        assert.isTrue(addCourseEnrollmentStub.calledWith(courseKey));
        assert.isTrue(fetchCoursePricesStub.calledWith());
        assert.isTrue(fetchDashboardStub.calledWith());
      });
    });

    it('should fail to add a course enrollment', () => {
      addCourseEnrollmentStub.returns(Promise.reject());

      let courseKey = 'course_key';
      return dispatchThen(addCourseEnrollment(courseKey), [
        REQUEST_ADD_COURSE_ENROLLMENT,
        RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE,
      ]).then(state => {
        assert.equal(state.courseEnrollAddStatus, FETCH_FAILURE);
        assert.isTrue(addCourseEnrollmentStub.calledWith(courseKey));
        assert.isFalse(fetchCoursePricesStub.calledWith());
        assert.isFalse(fetchDashboardStub.calledWith());
      });
    });
  });
});
