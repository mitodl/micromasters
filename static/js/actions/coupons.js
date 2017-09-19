// @flow
import type { Dispatch } from "redux"
import { createAction } from "redux-actions"

import type { Dispatcher } from "../flow/reduxTypes"
import type { Coupons, AttachCouponResponse } from "../flow/couponTypes"
import * as api from "../lib/api"

export const REQUEST_ATTACH_COUPON = "REQUEST_ATTACH_COUPON"
export const requestAttachCoupon = createAction(REQUEST_ATTACH_COUPON)

export const RECEIVE_ATTACH_COUPON_SUCCESS = "RECEIVE_ATTACH_COUPON_SUCCESS"
export const receiveAttachCouponSuccess = createAction(
  RECEIVE_ATTACH_COUPON_SUCCESS
)

export const RECEIVE_ATTACH_COUPON_FAILURE = "RECEIVE_ATTACH_COUPON_FAILURE"
export const receiveAttachCouponFailure = createAction(
  RECEIVE_ATTACH_COUPON_FAILURE
)

export const attachCoupon = (code: string): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(requestAttachCoupon())
    return api.attachCoupon(code).then(
      (response: AttachCouponResponse) => {
        dispatch(receiveAttachCouponSuccess(response))
        return Promise.resolve(response)
      },
      response => {
        dispatch(receiveAttachCouponFailure(response))
        return Promise.reject(response)
      }
    )
  }
}

export const REQUEST_FETCH_COUPONS = "REQUEST_FETCH_COUPONS"
export const requestFetchCoupons = createAction(REQUEST_FETCH_COUPONS)

export const RECEIVE_FETCH_COUPONS_SUCCESS = "RECEIVE_FETCH_COUPONS_SUCCESS"
export const receiveFetchCouponsSuccess = createAction(
  RECEIVE_FETCH_COUPONS_SUCCESS
)

export const RECEIVE_FETCH_COUPONS_FAILURE = "RECEIVE_FETCH_COUPONS_FAILURE"
export const receiveFetchCouponsFailure = createAction(
  RECEIVE_FETCH_COUPONS_FAILURE
)

export const fetchCoupons = (): Dispatcher<*> => {
  return (dispatch: Dispatch) => {
    dispatch(requestFetchCoupons())
    return api.getCoupons().then(
      (coupons: Coupons) => {
        dispatch(receiveFetchCouponsSuccess(coupons))
        return Promise.resolve(coupons)
      },
      () => {
        dispatch(receiveFetchCouponsFailure())
        return Promise.reject()
      }
    )
  }
}

export const CLEAR_COUPONS = "CLEAR_COUPONS"
export const clearCoupons = createAction(CLEAR_COUPONS)

export const SET_RECENTLY_ATTACHED_COUPON = "SET_RECENTLY_ATTACHED_COUPON"
export const setRecentlyAttachedCoupon = createAction(
  SET_RECENTLY_ATTACHED_COUPON
)
