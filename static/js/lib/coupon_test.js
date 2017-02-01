import { assert } from 'chai';
import sinon from 'sinon';

import {
  COUPON_CONTENT_TYPE_COURSERUN,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
} from '../constants';
import {
  calculateDiscount,
  calculatePrice,
  calculatePrices,
  calculateRunPrice,
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
      let coupons = makeCoupons([program]);
      let price = makeCoursePrice(program);
      let course = program.courses[0];
      let run = course.runs[0];

      let stubPrice = 5;
      let calculateRunPriceStub = sandbox.stub(couponFuncs, 'calculateRunPrice');
      calculateRunPriceStub.returns(stubPrice);
      let actual = calculatePrice(run.id, course.id, price, coupons);
      assert.equal(actual, stubPrice);
      let coupon = coupons.find(coupon => coupon.program_id === program.id);
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
      let programs = makeDashboard();
      let prices = makeCoursePrices(programs);
      let coupons = makeCoupons(programs);

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
        COUPON_CONTENT_TYPE_COURSERUN,
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

      it('calculates the price if the coupon matches for run', () => {
        coupon.content_type = COUPON_CONTENT_TYPE_COURSERUN;
        coupon.object_id = run.id;
        assert.equal(calculateRunPrice(run.id, course.id, program.id, price, coupon), discountedPrice);
        assert.isTrue(calculateDiscountStub.calledWith(price.price, coupon.amount_type, coupon.amount));
      });
    });
  });

  describe('calculateDiscount', () => {
    it('calculates a percent discount', () => {
      assert.equal(calculateDiscount(123, COUPON_AMOUNT_TYPE_FIXED_DISCOUNT, 50), 73);
      assert.equal(calculateDiscount(123, COUPON_AMOUNT_TYPE_FIXED_DISCOUNT, 123), 0);
    });

    it('calculates a fixed discount', () => {
      assert.equal(calculateDiscount(123, COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT, 0.5), 123 / 2);
      assert.equal(calculateDiscount(123, COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT, 1), 0);
    });
  });
});
