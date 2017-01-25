import React from 'react';
import { assert } from 'chai';
import { shallow } from 'enzyme';
import sinon from 'sinon';

import * as libCoupon from '../../lib/coupon';
import {
  COUPON_AMOUNT_TYPE_FIXED_PRICE,
  COUPON_CONTENT_TYPE_COURSE,
} from '../../constants';
import CouponMessage from './CouponMessage';
import { makeCoupon, makeProgram } from '../../factories/dashboard';

describe("CouponMessage", () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('renders a message for a coupon for a program', () => {
    let coupon = makeCoupon(makeProgram());
    let wrapper = shallow(
      <CouponMessage coupon={coupon} />
    );
    assert.equal(wrapper.text(), "You will get $50 off the cost for each course in this program.");
  });

  it('renders a message for a coupon for a course', () => {
    let coupon = makeCoupon(makeProgram());
    coupon.content_type = COUPON_CONTENT_TYPE_COURSE;
    let makeAmountMessageStub = sandbox.stub(libCoupon, 'makeAmountMessage').returns('all of the money');
    let makeCouponTargetMessageStub = sandbox.stub(libCoupon, 'makeCouponReason').returns(', because why not');
    let wrapper = shallow(
      <CouponMessage coupon={coupon} />
    );
    assert.equal(wrapper.text(), "You will get all of the money off the cost for this course, because why not.");
    assert.isTrue(makeAmountMessageStub.calledWith(coupon));
    assert.isTrue(makeCouponTargetMessageStub.calledWith(coupon));
  });

  it('renders a message for a coupon for an unknown content type', () => {
    let coupon = makeCoupon(makeProgram());
    coupon.content_type = 'xyz';
    let wrapper = shallow(
      <CouponMessage coupon={coupon} />
    );
    assert.equal(wrapper.text(), "");
  });

  it('renders a message for a coupon for a fixed price', () => {
    let coupon = makeCoupon(makeProgram());
    coupon.amount_type = COUPON_AMOUNT_TYPE_FIXED_PRICE;
    let wrapper = shallow(
      <CouponMessage coupon={coupon} />
    );
    assert.equal(wrapper.text(), "All courses are set to the discounted price of $50.");
  });
});
