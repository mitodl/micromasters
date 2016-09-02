import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';

import {
  FETCH_SUCCESS,
  FETCH_FAILURE,
} from '../actions';
import { PROGRAM_ENROLLMENTS } from '../constants';
import {
  addProgramEnrollment,
  fetchProgramEnrollments,
  receiveGetProgramEnrollmentsSuccess,
  clearEnrollments,

  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_FAILURE,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE,
  CLEAR_ENROLLMENTS,
} from '../actions/enrollments';
import * as api from '../util/api';
import rootReducer from '../reducers';

describe('enrollment reducers', () => {
  let sandbox, store, dispatchThen, getProgramEnrollmentsStub, addProgramEnrollmentStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.enrollments);
    getProgramEnrollmentsStub = sandbox.stub(api, 'getProgramEnrollments');
    addProgramEnrollmentStub = sandbox.stub(api, 'addProgramEnrollment');
  });

  afterEach(() => {
    sandbox.restore();
  });

  const newEnrollment = {
    id: 999,
    title: "New enrollment"
  };

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

    return dispatchThen(
      addProgramEnrollment(newEnrollment.id),
      [REQUEST_ADD_PROGRAM_ENROLLMENT, RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS]
    ).then(enrollmentsState => {
      assert.equal(enrollmentsState.postStatus, FETCH_SUCCESS);
      assert.deepEqual(enrollmentsState.programEnrollments, PROGRAM_ENROLLMENTS.concat(newEnrollment));
      assert.equal(addProgramEnrollmentStub.callCount, 1);
      assert.deepEqual(addProgramEnrollmentStub.args[0], [newEnrollment.id]);
    });
  });

  it('should fail to add a program enrollment and leave the existing state alone', () => {
    addProgramEnrollmentStub.returns(Promise.reject("addError"));
    store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAM_ENROLLMENTS));

    return dispatchThen(
      addProgramEnrollment(newEnrollment.id),
      [REQUEST_ADD_PROGRAM_ENROLLMENT, RECEIVE_ADD_PROGRAM_ENROLLMENT_FAILURE]
    ).then(enrollmentsState => {
      assert.equal(enrollmentsState.postStatus, FETCH_FAILURE);
      assert.equal(enrollmentsState.postErrorInfo, "addError");
      assert.deepEqual(enrollmentsState.programEnrollments, PROGRAM_ENROLLMENTS);
      assert.equal(addProgramEnrollmentStub.callCount, 1);
      assert.deepEqual(addProgramEnrollmentStub.args[0], [newEnrollment.id]);
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
});
