// @flow
import { assertCreatedActionHelper } from "./test_util"
import {
  REQUEST_GET_PEARSON_SSO_DIGEST,
  requestGetPearsonSSODigest,
  RECEIVE_GET_PEARSON_SSO_FAILURE,
  receiveGetPearsonSSOFailure,
  RECEIVE_GET_PEARSON_SSO_SUCCESS,
  receiveGetPearsonSSOSuccess,
  SET_PEARSON_ERROR,
  setPearsonError
} from "./pearson"

describe("generated pearson action helpers", () => {
  it("should create all action helpers", () => {
    [
      [requestGetPearsonSSODigest, REQUEST_GET_PEARSON_SSO_DIGEST],
      [receiveGetPearsonSSOFailure, RECEIVE_GET_PEARSON_SSO_FAILURE],
      [receiveGetPearsonSSOSuccess, RECEIVE_GET_PEARSON_SSO_SUCCESS],
      [setPearsonError, SET_PEARSON_ERROR]
    ].forEach(assertCreatedActionHelper)
  })
})
