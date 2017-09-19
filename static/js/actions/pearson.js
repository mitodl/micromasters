// @flow
import { createAction } from "redux-actions"
import type { Dispatch } from "redux"

import { getPearsonSSO } from "../lib/api"

export const REQUEST_GET_PEARSON_SSO_DIGEST = "REQUEST_GET_PEARSON_SSO_DIGEST"
export const requestGetPearsonSSODigest = createAction(
  REQUEST_GET_PEARSON_SSO_DIGEST
)

export const RECEIVE_GET_PEARSON_SSO_FAILURE = "RECEIVE_GET_PEARSON_SSO_FAILURE"
export const receiveGetPearsonSSOFailure = createAction(
  RECEIVE_GET_PEARSON_SSO_FAILURE
)

export const RECEIVE_GET_PEARSON_SSO_SUCCESS = "RECEIVE_GET_PEARSON_SSO_SUCCESS"
export const receiveGetPearsonSSOSuccess = createAction(
  RECEIVE_GET_PEARSON_SSO_SUCCESS
)

export function getPearsonSSODigest() {
  return (dispatch: Dispatch) => {
    dispatch(requestGetPearsonSSODigest())
    return getPearsonSSO().then(
      ok => {
        dispatch(receiveGetPearsonSSOSuccess())
        return Promise.resolve(ok)
      },
      err => {
        dispatch(receiveGetPearsonSSOFailure())
        return Promise.reject(err)
      }
    )
  }
}

export const PEARSON_SSO_IN_PROGRESS = "PEARSON_SSO_IN_PROGRESS"
export const pearsonSSOInProgress = createAction(PEARSON_SSO_IN_PROGRESS)

export const PEARSON_SSO_FAILURE = "PEARSON_SSO_FAILURE"
export const pearsonSSOFailure = createAction(PEARSON_SSO_FAILURE)

export const SET_PEARSON_ERROR = "SET_PEARSON_ERROR"
export const setPearsonError = createAction(SET_PEARSON_ERROR)
