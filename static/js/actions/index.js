// @flow
/* global SETTINGS: false */
import * as api from "../lib/api"
import type { Dispatcher } from "../flow/reduxTypes"

// constants for fetch status (these are not action types)
export const FETCH_FAILURE = "FETCH_FAILURE"
export const FETCH_SUCCESS = "FETCH_SUCCESS"
export const FETCH_PROCESSING = "FETCH_PROCESSING"

// Checkout actions - PAYMENTS DISCONTINUED IN 2021
// These are stubs to maintain compatibility
export const REQUEST_CHECKOUT = "REQUEST_CHECKOUT"
export const RECEIVE_CHECKOUT_SUCCESS = "RECEIVE_CHECKOUT_SUCCESS"
export const RECEIVE_CHECKOUT_FAILURE = "RECEIVE_CHECKOUT_FAILURE"

export const requestCheckout = (courseId: string) => ({
  type:    REQUEST_CHECKOUT,
  payload: { courseId }
})

export const receiveCheckoutSuccess = (url: string, payload: Object) => ({
  type:    RECEIVE_CHECKOUT_SUCCESS,
  payload: {
    payload,
    url
  }
})

export const receiveCheckoutFailure = (error: any) => ({
  type:    RECEIVE_CHECKOUT_FAILURE,
  payload: { errorInfo: error }
})

// eslint-disable-next-line require-jsdoc
export function checkout(courseId: string): Dispatcher<*> {
  return (dispatch: Dispatch) => {
    dispatch(requestCheckout(courseId))
    return api.checkout(courseId).then(
      response => {
        dispatch(receiveCheckoutSuccess("", {}))
        return Promise.resolve(response)
      },
      error => {
        dispatch(receiveCheckoutFailure(error))
        return Promise.reject(error)
      }
    )
  }
}
