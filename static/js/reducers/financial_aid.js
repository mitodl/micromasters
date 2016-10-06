// @flow
import {
  START_CALCULATOR_EDIT,
  CLEAR_CALCULATOR_EDIT,
  UPDATE_CALCULATOR_EDIT,
  UPDATE_CALCULATOR_VALIDATION,
  REQUEST_ADD_FINANCIAL_AID,
  RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
  RECEIVE_ADD_FINANCIAL_AID_FAILURE,
  REQUEST_SKIP_FINANCIAL_AID,
  RECEIVE_SKIP_FINANCIAL_AID_FAILURE,
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
} from '../actions/financial_aid';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import type { Action } from '../flow/reduxTypes';

export const INITIAL_FINANCIAL_AID_STATE = {};

export const FINANCIAL_AID_EDIT = {
  income:       "",
  currency:     "",
  checkBox:     false,
  fetchStatus:  null,
  programId:    null,
  validation:   {},
};

export type FinancialAidValidation = {
  income?: string,
  currency?: string,
  checkBox?: string,
};

export type FinancialAidState = {
  income?:      string,
  currency?:    string,
  checkBox?:    boolean,
  fetchStatus?: string,
  programId?:   number,
  validation?:  FinancialAidValidation,
};

export const financialAid = (state: FinancialAidState = INITIAL_FINANCIAL_AID_STATE, action: Action) => {
  switch (action.type) {
  case START_CALCULATOR_EDIT:
    return { ...FINANCIAL_AID_EDIT, programId: action.payload };
  case CLEAR_CALCULATOR_EDIT:
    return INITIAL_FINANCIAL_AID_STATE;
  case UPDATE_CALCULATOR_EDIT:
    return { ...state, ...action.payload };
  case UPDATE_CALCULATOR_VALIDATION:
    return { ...state, validation: action.payload };
  case REQUEST_ADD_FINANCIAL_AID:
    return { ...state, fetchStatus: FETCH_PROCESSING };
  case RECEIVE_ADD_FINANCIAL_AID_SUCCESS:
    return { ...state, fetchStatus: FETCH_SUCCESS };
  case RECEIVE_ADD_FINANCIAL_AID_FAILURE:
    return { ...state, fetchStatus: FETCH_FAILURE };
  case REQUEST_SKIP_FINANCIAL_AID:
    return { ...state, fetchStatus: FETCH_PROCESSING };
  case RECEIVE_SKIP_FINANCIAL_AID_SUCCESS:
    return { ...state, fetchStatus: FETCH_SUCCESS };
  case RECEIVE_SKIP_FINANCIAL_AID_FAILURE:
    return { ...state, fetchStatus: FETCH_FAILURE };
  default:
    return state;
  }
};
