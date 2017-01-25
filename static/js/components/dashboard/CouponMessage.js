// @flow
import React from 'react';

import {
  makeAmountMessage,
  makeCouponReason,
} from '../../lib/coupon';
import {
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
} from '../../constants';
import type { Coupon } from '../../flow/couponTypes';

export default class CouponMessage extends React.Component {
  props: {
    coupon: Coupon,
  };

  render() {
    const { coupon } = this.props;

    let isDiscount = (
      coupon.amount_type === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT ||
      coupon.amount_type === COUPON_AMOUNT_TYPE_FIXED_DISCOUNT
    );
    let message;
    if (isDiscount) {
      if (coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
        message = <span>
          You will get {makeAmountMessage(coupon)} off the cost for each course in this program
        </span>;
      } else if (coupon.content_type === COUPON_CONTENT_TYPE_COURSE) {
        message = <span>
          You will get {makeAmountMessage(coupon)} off the cost for this course
        </span>;
      }
    } else {
      if (coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
        message = <span>
          All courses are set to the discounted price of {makeAmountMessage(coupon)}
        </span>;
      } else if (coupon.content_type === COUPON_CONTENT_TYPE_COURSE) {
        message = <span>
          This course is set to the discounted price of {makeAmountMessage(coupon)}
        </span>;
      }
    }

    if (message === undefined) {
      return null;
    } else {
      return <div className="coupon-message">
        {message}{makeCouponReason(coupon)}.
      </div>;
    }
  }
}
