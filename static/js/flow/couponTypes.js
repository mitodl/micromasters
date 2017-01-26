// @flow
import Decimal from 'decimal.js-light';
import {
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_COURSERUN,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
} from '../constants';

export type Coupon = {
  coupon_code: string,
  coupon_type: string,
  content_type: COUPON_CONTENT_TYPE_COURSERUN | COUPON_CONTENT_TYPE_COURSE | COUPON_CONTENT_TYPE_PROGRAM,
  amount_type: COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT | COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  amount: Decimal,
  program_id: number,
  object_id: number,  // either program id, course id, or run id (different than the course key)
};

export type Coupons = Array<Coupon>;

export type AttachCouponResponse = {
  message: string,
  coupon: Coupon,
};

export type CalculatedPrices = Map<number, number>;
