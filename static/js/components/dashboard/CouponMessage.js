// @flow
import React from 'react';

import {
  makeAmountMessage,
  makeCouponReason,
} from '../../lib/coupon';
import {
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_COURSERUN,
} from '../../constants';
import type { Coupon } from '../../flow/couponTypes';

export default class CouponMessage extends React.Component {
  props: {
    coupon: Coupon,
  };

  makeCouponTargetMessage = () => {
    const { coupon } = this.props;

    if (coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
      return ' for each course in this program';
    } else if (coupon.content_type === COUPON_CONTENT_TYPE_COURSE ||
      coupon.content_type === COUPON_CONTENT_TYPE_COURSERUN) {
      return ' for this course';
    } else {
      return '';
    }
  };

  render() {
    const { coupon } = this.props;

    return <div className="coupon-message">
      You will get <strong>{makeAmountMessage(coupon)}</strong> the
      cost{this.makeCouponTargetMessage()}{makeCouponReason(coupon)}.
    </div>;
  }
}
