// @flow
import {
  REQUEST_ATTACH_COUPON,
  RECEIVE_ATTACH_COUPON_SUCCESS,
  RECEIVE_ATTACH_COUPON_FAILURE,
  REQUEST_FETCH_COUPONS,
  RECEIVE_FETCH_COUPONS_SUCCESS,
  RECEIVE_FETCH_COUPONS_FAILURE,
  CLEAR_COUPONS,
  SET_RECENTLY_ATTACHED_COUPON
} from "../actions/coupons"
import { FETCH_FAILURE, FETCH_PROCESSING, FETCH_SUCCESS } from "../actions"
import type { Action } from "../flow/reduxTypes"
import type { Coupon, Coupons } from "../flow/couponTypes"
import { getCoupons, attachCoupon } from "../lib/api"
import { GET, POST } from "../constants"
import type { Endpoint } from "../flow/restTypes"

export const couponEndpoint: Endpoint = {
  name:                "coupons",
  namespaceOnUsername: false,
  checkNoSpinner:      false,
  getPrefix:           "FETCH",
  postPrefix:          "ATTACH",
  getFunc:             getCoupons,
  postFunc:            attachCoupon,
  verbs:               [GET, POST],
  extraActions:        {
    [SET_RECENTLY_ATTACHED_COUPON]: (
      state: Object,
      action: Action<any, any>
    ) => ({
      ...state,
      recentlyAttachedCoupon: action.payload
    })
  }
}

export type CouponsState = {
  fetchPostStatus?: string,
  fetchGetStatus?: string,
  coupons: Coupons,
  recentlyAttachedCoupon: ?Coupon
}

export const INITIAL_COUPONS_STATE: CouponsState = {
  coupons:                [],
  recentlyAttachedCoupon: null
}

export const coupons = (
  state: CouponsState = INITIAL_COUPONS_STATE,
  action: Action<any, null>
) => {
  switch (action.type) {
  case REQUEST_ATTACH_COUPON:
    return { ...state, fetchPostStatus: FETCH_PROCESSING }
  case RECEIVE_ATTACH_COUPON_SUCCESS:
    return { ...state, fetchPostStatus: FETCH_SUCCESS }
  case RECEIVE_ATTACH_COUPON_FAILURE:
    return { ...state, fetchPostStatus: FETCH_FAILURE }
  case REQUEST_FETCH_COUPONS:
    return { ...state, fetchGetStatus: FETCH_PROCESSING }
  case RECEIVE_FETCH_COUPONS_SUCCESS:
    return {
      ...state,
      fetchGetStatus: FETCH_SUCCESS,
      coupons:        action.payload
    }
  case RECEIVE_FETCH_COUPONS_FAILURE:
    return { ...state, fetchGetStatus: FETCH_FAILURE }
  case CLEAR_COUPONS:
    return INITIAL_COUPONS_STATE
  case SET_RECENTLY_ATTACHED_COUPON:
    return { ...state, recentlyAttachedCoupon: action.payload }
  default:
    return state
  }
}
