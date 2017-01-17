// @flow
import {
  REQUEST_ATTACH_COUPON,
  RECEIVE_ATTACH_COUPON_SUCCESS,
  RECEIVE_ATTACH_COUPON_FAILURE,
  REQUEST_FETCH_COUPONS,
  RECEIVE_FETCH_COUPONS_SUCCESS,
  RECEIVE_FETCH_COUPONS_FAILURE,
} from '../actions/coupons';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import type { Action } from '../flow/reduxTypes';

export type CouponsState = {
  fetchPostStatus?:  string,
  fetchGetStatus?: string,
};

export const INITIAL_COUPONS_STATE: CouponsState = {};

export const coupons = (state: CouponsState = INITIAL_COUPONS_STATE, action: Action) => {
  switch (action.type) {
  case REQUEST_ATTACH_COUPON:
    return { ...state, fetchPostStatus: FETCH_PROCESSING };
  case RECEIVE_ATTACH_COUPON_SUCCESS:
    return { ...state, fetchPostStatus: FETCH_SUCCESS };
  case RECEIVE_ATTACH_COUPON_FAILURE:
    return { ...state, fetchPostStatus: FETCH_FAILURE };
  case REQUEST_FETCH_COUPONS:
    return { ...state, fetchGetStatus: FETCH_PROCESSING };
  case RECEIVE_FETCH_COUPONS_SUCCESS:
    return { ...state, fetchGetStatus: FETCH_SUCCESS };
  case RECEIVE_FETCH_COUPONS_FAILURE:
    return { ...state, fetchGetStatus: FETCH_FAILURE};
  default:
    return state;
  }
};
