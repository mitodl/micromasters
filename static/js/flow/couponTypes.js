// @flow
import {
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_COURSERUN,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
} from '../constants';

export type Coupon = {
  coupon_code: string,
  content_type: COUPON_CONTENT_TYPE_COURSERUN | COUPON_CONTENT_TYPE_COURSE | COUPON_CONTENT_TYPE_PROGRAM,
  amount_type: COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT | COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  amount: string,  // Python decimal type exposes floats as strings so we need to parse here
  program_id: number,
  object_id: number,  // either program id, course id, or run id (different than the course key)
};

export type Coupons = Array<Coupon>;

export type CalculatedPrices = Array<{
  id: number,
  courses: Array<{
    id: number,
    runs: Array<{
      id: number,
      price: ?number
    }>
  }>
}>;
