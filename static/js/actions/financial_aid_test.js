// @flow
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
  receiveAddFinancialAidSuccess,
  RECEIVE_ADD_FINANCIAL_AID_FAILURE,
  receiveAddFinancialAidFailure,
  REQUEST_SKIP_FINANCIAL_AID,
  requestSkipFinancialAid,
  RECEIVE_SKIP_FINANCIAL_AID_FAILURE,
  receiveSkipFinancialAidFailure,
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
  receiveSkipFinancialAidSuccess
} from "./financial_aid"
import { assertCreatedActionHelper } from "./test_util"

describe("financial aid actions", () => {
  it("should create all action creators", () => {
    [
      [startCalculatorEdit, START_CALCULATOR_EDIT],
      [clearCalculatorEdit, CLEAR_CALCULATOR_EDIT],
      [updateCalculatorEdit, UPDATE_CALCULATOR_EDIT],
      [updateCalculatorValidation, UPDATE_CALCULATOR_VALIDATION],
      [requestAddFinancialAid, REQUEST_ADD_FINANCIAL_AID],
      [receiveAddFinancialAidSuccess, RECEIVE_ADD_FINANCIAL_AID_SUCCESS],
      [receiveAddFinancialAidFailure, RECEIVE_ADD_FINANCIAL_AID_FAILURE],
      [requestSkipFinancialAid, REQUEST_SKIP_FINANCIAL_AID],
      [receiveSkipFinancialAidFailure, RECEIVE_SKIP_FINANCIAL_AID_FAILURE],
      [receiveSkipFinancialAidSuccess, RECEIVE_SKIP_FINANCIAL_AID_SUCCESS]
    ].forEach(assertCreatedActionHelper)
  })
})
