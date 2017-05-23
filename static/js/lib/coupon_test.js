import { assert } from 'chai';
import sinon from 'sinon';
import Decimal from 'decimal.js-light';

import {
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_TYPE_DISCOUNTED_PREVIOUS_COURSE,
  COUPON_AMOUNT_TYPE_FIXED_PRICE,
} from '../constants';
import {
  calculateDiscount,
  calculatePrice,
  calculatePrices,
  calculateRunPrice,
  makeAmountMessage,
  makeCouponReason,
} from './coupon';
import * as couponFuncs from './coupon';
import {
  makeCoupon,
  makeCoupons,
  makeCoursePrice,
  makeCoursePrices,
  makeDashboard,
  makeProgram,
} from '../factories/dashboard';

describe('coupon utility functions', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('calculatePrice', () => {
    it('uses calculateRunPrice to figure out price', () => {
      let program = makeProgram();
      let coupons = makeCoupons({"programs": [program]});
      let price = makeCoursePrice(program);
      let course = program.courses[0];
      let run = course.runs[0];

      let stubPrice = 5;
      let calculateRunPriceStub = sandbox.stub(couponFuncs, 'calculateRunPrice');
      calculateRunPriceStub.returns(stubPrice);
      let [ actualCoupon, actualPrice ] = calculatePrice(run.id, course.id, price, coupons);
      assert.equal(actualPrice, stubPrice);
      let coupon = coupons.find(coupon => coupon.program_id === program.id);
      assert.deepEqual(actualCoupon, coupon);
      assert.isTrue(calculateRunPriceStub.calledWith(
        run.id, course.id, program.id, price, coupon
      ));
    });
  });

  describe('calculatePrices', () => {
    it("returns an empty list if there are no programs", () => {
      assert.deepEqual(calculatePrices([], [], []), new Map());
    });

    it('uses calculateRunPrice to figure out prices', () => {
      let dashboard = makeDashboard();
      let programs = dashboard.programs;
      let prices = makeCoursePrices(dashboard);
      let coupons = makeCoupons(dashboard);

      let stubPrice = 5;
      let calculateRunPriceStub = sandbox.stub(couponFuncs, 'calculateRunPrice');
      calculateRunPriceStub.returns(stubPrice);

      let expected = new Map();
      for (const program of programs) {
        for (const course of program.courses) {
          for (const run of course.runs) {
            expected.set(run.id, stubPrice);
          }
        }
      }

      let actual = calculatePrices(programs, prices, coupons);
      assert.deepEqual(actual, expected);
      for (const program of programs) {
        let price = prices.filter(price => price.program_id === program.id)[0];
        let coupon = coupons.filter(coupon => coupon.program_id === program.id)[0];

        for (const course of program.courses) {
          for (const run of course.runs) {
            assert.isTrue(calculateRunPriceStub.calledWith(
              run.id, course.id, program.id, price, coupon
            ));
          }
        }
      }
    });
  });

  describe('calculateRunPrice', () => {
    let program, course, run, price, coupon;

    beforeEach(() => {
      program = makeProgram();
      course = program.courses[0];
      run = course.runs[0];
      price = makeCoursePrice(program);
      coupon = makeCoupon(program);
    });

    it('returns null if there is no price', () => {
      assert.isNull(calculateRunPrice(run.id, course.id, program.id, null, coupon));
    });

    it('uses the program price in the CoursePrice dict if there is no coupon', () => {
      assert.equal(calculateRunPrice(run.id, course.id, program.id, price, null), price.price);
    });

    it('uses the program price if the coupon does not match', () => {
      for (const contentType of [
        COUPON_CONTENT_TYPE_PROGRAM,
        COUPON_CONTENT_TYPE_COURSE,
      ]) {
        coupon.content_type = contentType;
        coupon.object_id = -1;
        assert.equal(calculateRunPrice(run.id, course.id, program.id, price, coupon), price.price);
      }
    });

    describe('uses calculateDiscount', () => {
      let discountedPrice = 47;
      let calculateDiscountStub;
      beforeEach(() => {
        calculateDiscountStub = sandbox.stub(couponFuncs, 'calculateDiscount');
        calculateDiscountStub.returns(discountedPrice);
      });

      it('calculates the price if the coupon matches for program', () => {
        coupon.content_type = COUPON_CONTENT_TYPE_PROGRAM;
        coupon.object_id = program.id;
        assert.equal(calculateRunPrice(run.id, course.id, program.id, price, coupon), discountedPrice);
        assert.isTrue(calculateDiscountStub.calledWith(price.price, coupon.amount_type, coupon.amount));
      });

      it('calculates the price if the coupon matches for course', () => {
        coupon.content_type = COUPON_CONTENT_TYPE_COURSE;
        coupon.object_id = course.id;
        assert.equal(calculateRunPrice(run.id, course.id, program.id, price, coupon), discountedPrice);
        assert.isTrue(calculateDiscountStub.calledWith(price.price, coupon.amount_type, coupon.amount));
      });
    });
  });

  describe('calculateDiscount', () => {
    it('calculates a percent discount', () => {
      const actual1 = calculateDiscount(Decimal('123'), COUPON_AMOUNT_TYPE_FIXED_DISCOUNT, Decimal('50'));
      const expected1 = Decimal('73');
      assert(actual1.equals(expected1));
      const actual2 = calculateDiscount(Decimal('123'), COUPON_AMOUNT_TYPE_FIXED_DISCOUNT, Decimal('123'));
      const expected2 = Decimal('0');
      assert(actual2.equals(expected2));
    });

    it('calculates a fixed discount', () => {
      const actual1 = calculateDiscount(Decimal('123'), COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT, Decimal('0.5'));
      const expected1 = Decimal('61.5');
      assert(actual1.equals(expected1));
      const actual2 = calculateDiscount(Decimal(123), COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT, Decimal(1));
      const expected2 = Decimal('0');
      assert(actual2.equals(expected2));
    });

    it('calculates a fixed price', () => {
      const actual1 = calculateDiscount(Decimal('123'), COUPON_AMOUNT_TYPE_FIXED_PRICE, Decimal('50'));
      const expected1 = Decimal('50');
      assert(actual1.equals(expected1));
      const actual2 = calculateDiscount(Decimal('123'), COUPON_AMOUNT_TYPE_FIXED_PRICE, Decimal('150'));
      const expected2 = Decimal('123');
      assert(actual2.equals(expected2));
    });

    it('caps the minimum price between 0 and the current price', () => {
      const actual1 = calculateDiscount(Decimal('123'), COUPON_AMOUNT_TYPE_FIXED_DISCOUNT, Decimal('150'));
      const expected1 = Decimal('0');
      assert(actual1.equals(expected1));
      const actual2 = calculateDiscount(Decimal('50'), COUPON_AMOUNT_TYPE_FIXED_DISCOUNT, Decimal('-50'));
      const expected2 = Decimal('50');
      assert(actual2.equals(expected2));
    });
  });

  describe('makeAmountMessage', () => {
    it('has a message for fixed discount', () => {
      let coupon = makeCoupon(makeProgram());
      coupon.amount_type = COUPON_AMOUNT_TYPE_FIXED_DISCOUNT;
      coupon.amount = Decimal("50.34");
      assert.equal(makeAmountMessage(coupon), '$50.34');
    });

    it('has a message for percent discount', () => {
      let coupon = makeCoupon(makeProgram());
      coupon.amount_type = COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT;
      coupon.amount = Decimal("0.3456");
      assert.equal(makeAmountMessage(coupon), '35%');
    });

    it('has no message if amount type is unknown', () => {
      let coupon = makeCoupon(makeProgram());
      coupon.amount_type = 'missing';
      assert.equal(makeAmountMessage(coupon), '');
    });
  });

  describe('makeCouponReason', () => {
    it('has a reason for the discounted previous course case', () => {
      let coupon = makeCoupon(makeProgram());
      coupon.coupon_type = COUPON_TYPE_DISCOUNTED_PREVIOUS_COURSE;
      assert.equal(makeCouponReason(coupon), ', because you have taken it before');
    });

    it('has no reason for other cases', () => {
      let coupon = makeCoupon(makeProgram());
      assert.equal(makeCouponReason(coupon), '');
    });
  });
});
