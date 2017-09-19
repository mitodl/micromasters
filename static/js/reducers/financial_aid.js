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
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS
} from "../actions/financial_aid"
import { FETCH_FAILURE, FETCH_PROCESSING, FETCH_SUCCESS } from "../actions"
import type { Action } from "../flow/reduxTypes"

export const INITIAL_FINANCIAL_AID_STATE = {}

export const FINANCIAL_AID_EDIT = {
  income:          "",
  currency:        "",
  checkBox:        false,
  fetchAddStatus:  null,
  fetchSkipStatus: null,
  programId:       null,
  validation:      {},
  fetchError:      null
}

export type FinancialAidValidation = {
  income?: string,
  currency?: string,
  checkBox?: string
}

export type FetchError = {
  message?: string,
  code?: number
}

export type FinancialAidState = {
  income?: string,
  currency?: string,
  checkBox?: boolean,
  fetchAddStatus?: string,
  fetchSkipStatus?: string,
  programId?: number,
  validation?: FinancialAidValidation,
  fetchError?: FetchError
}

export const financialAid = (
  state: FinancialAidState = INITIAL_FINANCIAL_AID_STATE,
  action: Action<any, null>
) => {
  switch (action.type) {
  case START_CALCULATOR_EDIT:
    return {
      ...FINANCIAL_AID_EDIT,
      programId:       action.payload,
      fetchAddStatus:  state.fetchAddStatus,
      fetchSkipStatus: state.fetchSkipStatus
    }
  case CLEAR_CALCULATOR_EDIT:
    return {
      ...FINANCIAL_AID_EDIT,
      fetchAddStatus:  state.fetchAddStatus,
      fetchSkipStatus: state.fetchSkipStatus
    }
  case UPDATE_CALCULATOR_EDIT:
    return { ...state, ...action.payload }
  case UPDATE_CALCULATOR_VALIDATION: {
    return { ...state, validation: action.payload }
  }
  case REQUEST_ADD_FINANCIAL_AID:
    return {
      ...state,
      fetchAddStatus: FETCH_PROCESSING,
      fetchError:     null,
      validation:     {}
    }
  case RECEIVE_ADD_FINANCIAL_AID_SUCCESS:
    return { ...state, fetchAddStatus: FETCH_SUCCESS }
  case RECEIVE_ADD_FINANCIAL_AID_FAILURE:
    return {
      ...state,
      fetchAddStatus: FETCH_FAILURE,
      fetchError:     action.payload
    }
  case REQUEST_SKIP_FINANCIAL_AID:
    return { ...state, fetchSkipStatus: FETCH_PROCESSING }
  case RECEIVE_SKIP_FINANCIAL_AID_SUCCESS:
    return { ...state, fetchSkipStatus: FETCH_SUCCESS }
  case RECEIVE_SKIP_FINANCIAL_AID_FAILURE:
    return { ...state, fetchSkipStatus: FETCH_FAILURE }
  default:
    return state
  }
}
