// @flow
import {
  REQUEST_GET_PEARSON_SSO_DIGEST,
  RECEIVE_GET_PEARSON_SSO_FAILURE,
  RECEIVE_GET_PEARSON_SSO_SUCCESS,
  PEARSON_SSO_IN_PROGRESS,
  PEARSON_SSO_FAILURE,
  SET_PEARSON_ERROR
} from "../actions/pearson"
import { FETCH_FAILURE, FETCH_PROCESSING, FETCH_SUCCESS } from "../actions"
import type { Action } from "../flow/reduxTypes"

export const INITIAL_PEARSON_STATE = {
  getStatus: null,
  error:     null
}

export type PearsonAPIState = {
  getStatus: ?string,
  error: ?string
}

export const pearson = (
  state: PearsonAPIState = INITIAL_PEARSON_STATE,
  action: Action<any, null>
) => {
  switch (action.type) {
  case REQUEST_GET_PEARSON_SSO_DIGEST:
    return { ...state, getStatus: FETCH_PROCESSING }
  case RECEIVE_GET_PEARSON_SSO_FAILURE:
    return { ...state, getStatus: FETCH_FAILURE }
  case RECEIVE_GET_PEARSON_SSO_SUCCESS:
    return { ...state, getStatus: FETCH_SUCCESS }
  case PEARSON_SSO_IN_PROGRESS:
    return { ...state, postStatus: FETCH_PROCESSING }
  case PEARSON_SSO_FAILURE:
    return { ...state, postStatus: FETCH_FAILURE }
  case SET_PEARSON_ERROR:
    return { ...state, error: action.payload }
  default:
    return state
  }
}
