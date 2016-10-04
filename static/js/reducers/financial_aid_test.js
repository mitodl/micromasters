// @flow
import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';
import R from 'ramda';

import {
  START_CALCULATOR_EDIT,
  startCalculatorEdit,
  CLEAR_CALCULATOR_EDIT,
  clearCalculatorEdit,
  UPDATE_CALCULATOR_EDIT,
  updateCalculatorEdit,
  UPDATE_CALCULATOR_VALIDATION,
  updateCalculatorValidation,
  REQUEST_ADD_FINANCIAL_AID,
  requestAddFinancialAid,
  RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
  RECEIVE_ADD_FINANCIAL_AID_FAILURE,
  addFinancialAid,
  REQUEST_SKIP_FINANCIAL_AID,
  RECEIVE_SKIP_FINANCIAL_AID_FAILURE,
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
  skipFinancialAid,
} from '../actions/financial_aid';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import { setCurrentProgramEnrollment } from '../actions/enrollments';
import {
  FINANCIAL_AID_EDIT,
  INITIAL_FINANCIAL_AID_STATE,
} from './financial_aid';
import rootReducer from '../reducers';
import * as api from '../util/api';

describe('financial aid reducers', () => {
  let sandbox, store, dispatchThen;
  let addFinancialAidStub, skipFinancialAidStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.financialAid);
    store.dispatch(setCurrentProgramEnrollment(1));
    addFinancialAidStub = sandbox.stub(api, 'addFinancialAid');
    skipFinancialAidStub = sandbox.stub(api, 'skipFinancialAid');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should let you start editing', () => {
    return dispatchThen(startCalculatorEdit(1), [START_CALCULATOR_EDIT]).then(state => {
      let expectation = Object.assign({}, FINANCIAL_AID_EDIT, {
        programId: 1
      });
      assert.deepEqual(state, expectation);
    });
  });


  it('should let you clear edits', () => {
    store.dispatch(startCalculatorEdit(1));
    return dispatchThen(clearCalculatorEdit(), [CLEAR_CALCULATOR_EDIT]).then(state => {
      assert.deepEqual(state, INITIAL_FINANCIAL_AID_STATE);
    });
  });

  it('should let you update an edit in progress', () => {
    store.dispatch(startCalculatorEdit(1));
    let update = R.clone(store.getState().financialAid);
    update.income = '1000000';
    return dispatchThen(updateCalculatorEdit(update), [UPDATE_CALCULATOR_EDIT]).then(state => {
      assert.deepEqual(state, update);
    });
  });

  it('should let you update the validation', () => {
    store.dispatch(startCalculatorEdit(1));
    let validation = { some: 'error' };
    return dispatchThen(updateCalculatorValidation(validation), [
      UPDATE_CALCULATOR_VALIDATION
    ]).then(state => {
      assert.deepEqual(state.validation, validation);
    });
  });

  it('should process adding a financial aid object', () => {
    store.dispatch(startCalculatorEdit(1));
    return dispatchThen(requestAddFinancialAid(100000, 'USD', 1), [
      REQUEST_ADD_FINANCIAL_AID
    ]).then(state => {
      assert.equal(state.fetchStatus, FETCH_PROCESSING);
    });
  });

  it('should let you add financial aid', () => {
    addFinancialAidStub.returns(Promise.resolve());
    let income = 100000;
    let currency = 'USD';
    let programId = 1;
    store.dispatch(startCalculatorEdit(programId));
    return dispatchThen(addFinancialAid(income, currency, programId), [
      REQUEST_ADD_FINANCIAL_AID,
      RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
    ]).then(state => {
      let expectation = Object.assign({}, FINANCIAL_AID_EDIT, {
        programId: programId,
        fetchStatus: FETCH_SUCCESS
      });
      assert.deepEqual(state, expectation);
    });
  });

  it('should fail to add a financial aid', () => {
    addFinancialAidStub.returns(Promise.reject());
    let income = 100000;
    let currency = 'USD';
    let programId = 1;
    store.dispatch(startCalculatorEdit(programId));
    return dispatchThen(addFinancialAid(income, currency, programId), [
      REQUEST_ADD_FINANCIAL_AID,
      RECEIVE_ADD_FINANCIAL_AID_FAILURE,
    ]).then(state => {
      let expectation = Object.assign({}, FINANCIAL_AID_EDIT, {
        programId: programId,
        fetchStatus: FETCH_FAILURE
      });
      assert.deepEqual(state, expectation);
      assert.ok(addFinancialAidStub.calledWith(income, currency, programId));
    });
  });

  it('should let you skip financial aid', () => {
    skipFinancialAidStub.returns(Promise.resolve());
    return dispatchThen(skipFinancialAid(2), [
      REQUEST_SKIP_FINANCIAL_AID,
      RECEIVE_SKIP_FINANCIAL_AID_SUCCESS
    ]).then(state => {
      assert.deepEqual(state, {
        fetchStatus: FETCH_SUCCESS
      });
      assert.ok(skipFinancialAidStub.calledWith(2));
    });
  });

  it('should fail to skip financial aid', () => {
    skipFinancialAidStub.returns(Promise.reject());
    return dispatchThen(skipFinancialAid(2), [
      REQUEST_SKIP_FINANCIAL_AID,
      RECEIVE_SKIP_FINANCIAL_AID_FAILURE
    ]).then(state => {
      assert.deepEqual(state, {
        fetchStatus: FETCH_FAILURE
      });
      assert.ok(skipFinancialAidStub.calledWith(2));
    });
  });
});
