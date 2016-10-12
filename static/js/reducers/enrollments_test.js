import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';

import {
  FETCH_SUCCESS,
  FETCH_FAILURE,
} from '../actions';
import {
  SET_TOAST_MESSAGE,
} from '../actions/ui';
import {
  PROGRAM_ENROLLMENTS,
  TOAST_SUCCESS,
  TOAST_FAILURE,
} from '../constants';
import {
  addProgramEnrollment,
  fetchProgramEnrollments,
  receiveGetProgramEnrollmentsSuccess,
  clearEnrollments,
  setCurrentProgramEnrollment,
  addCourseEnrollment,

  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
  CLEAR_ENROLLMENTS,
  SET_CURRENT_PROGRAM_ENROLLMENT,
  REQUEST_ADD_COURSE_ENROLLMENT,
  RECEIVE_ADD_COURSE_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_COURSE_ENROLLMENT_FAILURE,
} from '../actions/enrollments';
import * as api from '../util/api';
import * as actions from '../actions';
import rootReducer from '../reducers';

describe('enrollments', () => {
  let sandbox, store, getProgramEnrollmentsStub, addProgramEnrollmentStub, addCourseEnrollmentStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    getProgramEnrollmentsStub = sandbox.stub(api, 'getProgramEnrollments');
    addProgramEnrollmentStub = sandbox.stub(api, 'addProgramEnrollment');
    addCourseEnrollmentStub = sandbox.stub(api, 'addCourseEnrollment');
  });

  afterEach(() => {
    sandbox.restore();
  });

  const newEnrollment = {
    id: 999,
    title: "New enrollment"
  };

  describe('enrollments reducer', () => {
    let dispatchThen, fetchCoursePricesStub, fetchDashboardStub;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.enrollments);

      fetchCoursePricesStub = sandbox.stub(actions, 'fetchCoursePrices');
      fetchCoursePricesStub.returns({type: "fake"});
      fetchDashboardStub = sandbox.stub(actions, 'fetchDashboard');
      fetchDashboardStub.returns({type: "fake"});
    });

    it('should have an empty default state', () => {
      return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
        assert.deepEqual(state, {
          programEnrollments: []
        });
      });
    });

    it('should fetch program enrollments successfully', () => {
      getProgramEnrollmentsStub.returns(Promise.resolve(PROGRAM_ENROLLMENTS));

      return dispatchThen(
        fetchProgramEnrollments(),
        [REQUEST_GET_PROGRAM_ENROLLMENTS, RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS]
      ).then(enrollmentsState => {
        assert.equal(enrollmentsState.getStatus, FETCH_SUCCESS);
        assert.deepEqual(enrollmentsState.programEnrollments, PROGRAM_ENROLLMENTS);
        assert.equal(getProgramEnrollmentsStub.callCount, 1);
        assert.deepEqual(getProgramEnrollmentsStub.args[0], []);
      });
    });

    it('should fail to fetch program enrollments', () => {
      getProgramEnrollmentsStub.returns(Promise.reject("error"));

      return dispatchThen(
        fetchProgramEnrollments(),
        [REQUEST_GET_PROGRAM_ENROLLMENTS, RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE]
      ).then(enrollmentsState => {
        assert.equal(enrollmentsState.getStatus, FETCH_FAILURE);
        assert.equal(enrollmentsState.getErrorInfo, "error");
        assert.deepEqual(enrollmentsState.programEnrollments, []);
        assert.equal(getProgramEnrollmentsStub.callCount, 1);
        assert.deepEqual(getProgramEnrollmentsStub.args[0], []);
      });
    });

    it('should add a program enrollment successfully to the existing enrollments', () => {
      addProgramEnrollmentStub.returns(Promise.resolve(newEnrollment));
      store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAM_ENROLLMENTS));

      return dispatchThen(addProgramEnrollment(newEnrollment.id), [
        REQUEST_ADD_PROGRAM_ENROLLMENT,
        RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
        SET_TOAST_MESSAGE,
      ]).then(enrollmentsState => {
        assert.equal(enrollmentsState.postStatus, FETCH_SUCCESS);
        assert.deepEqual(enrollmentsState.programEnrollments, PROGRAM_ENROLLMENTS.concat(newEnrollment));
        assert.equal(addProgramEnrollmentStub.callCount, 1);
        assert.deepEqual(addProgramEnrollmentStub.args[0], [newEnrollment.id]);
        assert.ok(fetchCoursePricesStub.calledWith());
        assert.ok(fetchDashboardStub.calledWith());

        assert.deepEqual(
          store.getState().ui.toastMessage,
          {
            message: `You are now enrolled in the ${newEnrollment.title} MicroMasters`,
            icon: TOAST_SUCCESS,
          }
        );
      });
    });

    it('should fail to add a program enrollment and leave the existing state alone', () => {
      addProgramEnrollmentStub.returns(Promise.reject("addError"));
      store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAM_ENROLLMENTS));

      return dispatchThen(addProgramEnrollment(newEnrollment.id), [
        REQUEST_ADD_PROGRAM_ENROLLMENT,
        RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
        SET_TOAST_MESSAGE,
      ]).then(enrollmentsState => {
        assert.equal(enrollmentsState.postStatus, FETCH_FAILURE);
        assert.equal(enrollmentsState.postErrorInfo, "addError");
        assert.deepEqual(enrollmentsState.programEnrollments, PROGRAM_ENROLLMENTS);
        assert.equal(addProgramEnrollmentStub.callCount, 1);
        assert.deepEqual(addProgramEnrollmentStub.args[0], [newEnrollment.id]);
        assert.notOk(fetchCoursePricesStub.calledWith());
        assert.notOk(fetchDashboardStub.calledWith());

        assert.deepEqual(
          store.getState().ui.toastMessage,
          {
            message: "There was an error during enrollment",
            icon: TOAST_FAILURE,
          }
        );
      });
    });

    it('should clear the enrollments', () => {
      store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAM_ENROLLMENTS));

      return dispatchThen(clearEnrollments(), [CLEAR_ENROLLMENTS]).then(enrollmentsState => {
        assert.deepEqual(enrollmentsState, {
          programEnrollments: []
        });
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

  describe('currentProgramEnrollment reducer', () => {
    let dispatchThen;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.currentProgramEnrollment);
    });

    it('should have a null default state', () => {
      assert.equal(store.getState().currentProgramEnrollment, null);
    });

    it('should set the current enrollment', () => {
      return dispatchThen(setCurrentProgramEnrollment(PROGRAM_ENROLLMENTS[1]), [SET_CURRENT_PROGRAM_ENROLLMENT]).
        then(state => {
          assert.deepEqual(state, PROGRAM_ENROLLMENTS[1]);
        });
    });

    it("should pick the first enrollment if none is already set after receiving a list of enrollments", () => {
      store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAM_ENROLLMENTS));
      assert.deepEqual(store.getState().currentProgramEnrollment, PROGRAM_ENROLLMENTS[0]);
    });

    it("should replace the current enrollment if it can't be found in the list of enrollments", () => {
      let enrollment = {"id": 999, "title": "not an enrollment anymore"};
      store.dispatch(setCurrentProgramEnrollment(enrollment));
      store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAM_ENROLLMENTS));
      assert.deepEqual(store.getState().currentProgramEnrollment, PROGRAM_ENROLLMENTS[0]);
    });

    it("should clear the current enrollment if it can't be found in an empty list of enrollments", () => {
      let enrollment = {"id": 999, "title": "not an enrollment anymore"};
      store.dispatch(setCurrentProgramEnrollment(enrollment));
      store.dispatch(receiveGetProgramEnrollmentsSuccess([]));
      assert.deepEqual(store.getState().currentProgramEnrollment, null);
    });

    it("should not pick a current enrollment after receiving a list of enrollments if one is already picked", () => {
      store.dispatch(setCurrentProgramEnrollment(PROGRAM_ENROLLMENTS[1]));
      store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAM_ENROLLMENTS));
      assert.deepEqual(store.getState().currentProgramEnrollment, PROGRAM_ENROLLMENTS[1]);
    });
  });
});
