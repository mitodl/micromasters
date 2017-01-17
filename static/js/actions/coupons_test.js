// @flow
import {
  REQUEST_ATTACH_COUPON,
  requestAttachCoupon,
  RECEIVE_ATTACH_COUPON_SUCCESS,
  receiveAttachCouponSuccess,
  RECEIVE_ATTACH_COUPON_FAILURE,
  receiveAttachCouponFailure,
  REQUEST_FETCH_COUPONS,
  requestFetchCoupons,
  RECEIVE_FETCH_COUPONS_SUCCESS,
  receiveFetchCouponsSuccess,
  RECEIVE_FETCH_COUPONS_FAILURE,
  receiveFetchCouponsFailure,
} from './coupons';
import { assertCreatedActionHelper } from './util';

describe('coupons actions', () => {
  it('should create all action creators', () => {
    [
      [requestAttachCoupon, REQUEST_ATTACH_COUPON],
      [receiveAttachCouponSuccess, RECEIVE_ATTACH_COUPON_SUCCESS],
      [receiveAttachCouponFailure, RECEIVE_ATTACH_COUPON_FAILURE],
      [requestFetchCoupons, REQUEST_FETCH_COUPONS],
      [receiveFetchCouponsSuccess, RECEIVE_FETCH_COUPONS_SUCCESS],
      [receiveFetchCouponsFailure, RECEIVE_FETCH_COUPONS_FAILURE],
    ].forEach(assertCreatedActionHelper);
  });
});
