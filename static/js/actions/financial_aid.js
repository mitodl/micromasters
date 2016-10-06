// @flow
import type { Dispatch } from 'redux';
import { createAction } from 'redux-actions';

import type { Dispatcher } from '../flow/reduxTypes';
import * as api from '../util/api';
import {
  fetchCoursePrices,
  fetchDashboard,
} from '.';

export const START_CALCULATOR_EDIT = 'START_CALCULATOR_EDIT';
export const startCalculatorEdit = createAction(START_CALCULATOR_EDIT);

export const CLEAR_CALCULATOR_EDIT = 'CLEAR_CALCULATOR_EDIT';
export const clearCalculatorEdit = createAction(CLEAR_CALCULATOR_EDIT);

export const UPDATE_CALCULATOR_EDIT = 'UPDATE_CALCULATOR_EDIT';
export const updateCalculatorEdit = createAction(UPDATE_CALCULATOR_EDIT);

export const UPDATE_CALCULATOR_VALIDATION = 'UPDATE_PROFILE_VALIDATION';
export const updateCalculatorValidation = createAction(UPDATE_CALCULATOR_VALIDATION);

export const REQUEST_ADD_FINANCIAL_AID = 'REQUEST_ADD_FINANCIAL_AID';
export const requestAddFinancialAid = createAction(REQUEST_ADD_FINANCIAL_AID);

export const RECEIVE_ADD_FINANCIAL_AID_SUCCESS = 'RECEIVE_ADD_FINANCIAL_AID_SUCCESS';
export const receiveAddFinancialAidSuccess = createAction(RECEIVE_ADD_FINANCIAL_AID_SUCCESS);

export const RECEIVE_ADD_FINANCIAL_AID_FAILURE = 'RECEIVE_ADD_FINANCIAL_AID_FAILURE';
export const receiveAddFinancialAidFailure = createAction(RECEIVE_ADD_FINANCIAL_AID_FAILURE);

export const addFinancialAid = (income: number, currency: string, programId: number): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(requestAddFinancialAid());
    return api.addFinancialAid(income, currency, programId).then(
      () => {
        dispatch(receiveAddFinancialAidSuccess());
        dispatch(fetchCoursePrices());
        dispatch(fetchDashboard());
        return Promise.resolve();
      },
      () => {
        dispatch(receiveAddFinancialAidFailure());
        return Promise.reject();
      });
  };
};

export const REQUEST_SKIP_FINANCIAL_AID = 'REQUEST_SKIP_FINANCIAL_AID';
export const requestSkipFinancialAid = createAction(REQUEST_SKIP_FINANCIAL_AID);

export const RECEIVE_SKIP_FINANCIAL_AID_SUCCESS = 'RECEIVE_SKIP_FINANCIAL_AID_SUCCESS';
export const receiveSkipFinancialAidSuccess = createAction(RECEIVE_SKIP_FINANCIAL_AID_SUCCESS);

export const RECEIVE_SKIP_FINANCIAL_AID_FAILURE = 'RECEIVE_SKIP_FINANCIAL_AID_FAILURE';
export const receiveSkipFinancialAidFailure = createAction(RECEIVE_SKIP_FINANCIAL_AID_FAILURE);

export const skipFinancialAid = (programId: number): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(requestSkipFinancialAid());
    return api.skipFinancialAid(programId).then(
      () => {
        dispatch(receiveSkipFinancialAidSuccess());
        dispatch(fetchCoursePrices());
        dispatch(fetchDashboard());
        return Promise.resolve();
      },
      () => {
        dispatch(receiveSkipFinancialAidFailure());
      });
  };
};
