// @flow
/* global SETTINGS: false */
import type { Dispatch } from "redux"
import { createAction } from "redux-actions"

import * as api from "../lib/api"
import type { CheckoutResponse } from "../flow/checkoutTypes"
import type { APIErrorInfo } from "../flow/generalTypes"
import type { Dispatcher } from "../flow/reduxTypes"

// constants for fetch status (these are not action types)
export const FETCH_FAILURE = "FETCH_FAILURE"
export const FETCH_SUCCESS = "FETCH_SUCCESS"
export const FETCH_PROCESSING = "FETCH_PROCESSING"

export const REQUEST_CHECKOUT = "REQUEST_CHECKOUT"
export const requestCheckout = (courseId: string) => ({
  type:    REQUEST_CHECKOUT,
  payload: { courseId }
})

export function checkout(courseId: string): Dispatcher<?CheckoutResponse> {
  return (dispatch: Dispatch) => {
    dispatch(requestCheckout(courseId))
    return api.checkout(courseId).then(
      response => {
        const { url, payload } = response
        dispatch(receiveCheckoutSuccess(url, payload))
        return Promise.resolve(response)
      },
      error => {
        dispatch(receiveCheckoutFailure(error))
      }
    )
  }
}

export const RECEIVE_CHECKOUT_SUCCESS = "RECEIVE_CHECKOUT_SUCCESS"

export const receiveCheckoutSuccess = createAction(
  RECEIVE_CHECKOUT_SUCCESS,
  (url, payload) => ({
    url,
    payload
  })
)

export const RECEIVE_CHECKOUT_FAILURE = "RECEIVE_CHECKOUT_FAILURE"
export const receiveCheckoutFailure = createAction(
  RECEIVE_CHECKOUT_FAILURE,
  (errorInfo: APIErrorInfo) => ({ errorInfo })
)
