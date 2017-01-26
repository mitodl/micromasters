// @flow
import React from 'react';
import Card from 'react-mdl/lib/Card/Card';
import CardTitle from 'react-mdl/lib/Card/CardTitle';

import type { Coupon } from '../../flow/couponTypes';
import CouponMessage from './CouponMessage';

type CouponCardProps = {
  coupon: Coupon,
};

const CouponCard = (props: CouponCardProps) => {
  const { coupon } = props;
  return <Card shadow={0}>
    <CardTitle>Coupons</CardTitle>
    <div>
      <CouponMessage coupon={coupon} />
    </div>
  </Card>;
};
export default CouponCard;
