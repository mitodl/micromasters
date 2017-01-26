// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import CouponCard from './CouponCard';
import { makeCoupon, makeProgram } from '../../factories/dashboard';

describe("CouponCard", () => {
  it('forwards proper props', () => {
    let coupon = makeCoupon(makeProgram());
    let wrapper = shallow(<CouponCard coupon={coupon} />);
    assert.deepEqual(wrapper.find("CouponMessage").props(), {
      coupon: coupon,
    });
  });
});
