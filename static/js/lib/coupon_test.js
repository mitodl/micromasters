import { assert } from 'chai';
import sinon from 'sinon';
import Decimal from 'decimal.js-light';

import {
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_TYPE_DISCOUNTED_PREVIOUS_COURSE,
  COUPON_AMOUNT_TYPE_FIXED_PRICE,
} from '../constants';
import {
  calculateDiscount,
  calculatePrices,
  makeAmountMessage,
  makeCouponReason,
  makeCouponMessage,
} from './coupon';
import * as couponFuncs from './coupon';
import {
  makeCoupon,
  makeCourseCoupon,
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

  describe('calculatePrices', () => {
    let dashboard, programs, coursePrices, pricesLookup;
    beforeEach(() => {
      dashboard = makeDashboard();
      programs = dashboard.programs;
      coursePrices = makeCoursePrices(dashboard);
      pricesLookup = new Map();
      for (let price of coursePrices) {
        pricesLookup.set(price.program_id, price.price);
      }
    });

    it("returns an empty set of maps if there are no programs", () => {
      assert.deepEqual(calculatePrices([], [], []), {
        pricesInclCouponByRun: new Map(),
        pricesInclCouponByCourse: new Map(),
        pricesInclCouponByProgram: new Map(),
        pricesExclCouponByProgram: new Map(),
      });
    });

    it('returns some Maps with a price defined for every program, course and run', () => {
      let expectedRunPrices = new Map();
      let expectedCoursePrices = new Map();
      let expectedProgramPrices = new Map();
      for (const program of programs) {
        expectedProgramPrices.set(program.id, {
          coupon: null,
          price: pricesLookup.get(program.id),
        });
        for (const course of program.courses) {
          expectedCoursePrices.set(course.id, {
            coupon: null,
            price: pricesLookup.get(program.id),
          });
          for (const run of course.runs) {
            expectedRunPrices.set(run.id, {
              coupon: null,
              price: pricesLookup.get(program.id),
            });
          }
        }
      }

      const prices = calculatePrices(programs, coursePrices, []);
      assert.deepEqual(prices, {
        pricesExclCouponByProgram: expectedProgramPrices,
        pricesInclCouponByProgram: expectedProgramPrices,
        pricesInclCouponByCourse: expectedCoursePrices,
        pricesInclCouponByRun: expectedRunPrices,
      });
    });

    it('applies a program coupon', () => {
      let program = programs[0];
      let coupon = makeCoupon(program);
      let programPrice = pricesLookup.get(program.id);
      let priceWithCoupon = new Decimal(programPrice - 50);
      const prices = calculatePrices(programs, coursePrices, [coupon]);

      assert.deepEqual(prices.pricesInclCouponByProgram.get(program.id), {
        price: priceWithCoupon,
        coupon: coupon,
      });
      assert.deepEqual(prices.pricesExclCouponByProgram.get(program.id), {
        price: programPrice,
        coupon: null,
      });

      for (const course of program.courses) {
        assert.deepEqual(prices.pricesInclCouponByCourse.get(course.id), {
          price: priceWithCoupon,
          coupon: coupon,
        });
        for (const run of course.runs) {
          assert.deepEqual(prices.pricesInclCouponByRun.get(run.id), {
            price: priceWithCoupon,
            coupon: coupon,
          });
        }
      }
    });

    it('applies a course coupon', () => {
      let program = programs[0];
      let course = program.courses[1];
      let coupon = makeCoupon(program);
      coupon.content_type = COUPON_CONTENT_TYPE_COURSE;
      coupon.object_id = course.id;
      let programPrice = pricesLookup.get(program.id);
      let priceWithCoupon = new Decimal(programPrice - 50);
      const prices = calculatePrices(programs, coursePrices, [coupon]);

      assert.deepEqual(prices.pricesInclCouponByProgram.get(program.id), {
        price: programPrice,
        coupon: null,
      });
      assert.deepEqual(prices.pricesExclCouponByProgram.get(program.id), {
        price: programPrice,
        coupon: null,
      });

      assert.deepEqual(prices.pricesInclCouponByCourse.get(course.id), {
        price: priceWithCoupon,
        coupon: coupon,
      });
      for (const run of course.runs) {
        assert.deepEqual(prices.pricesInclCouponByRun.get(run.id), {
          price: priceWithCoupon,
          coupon: coupon,
        });
      }
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

  describe('makeCouponMessage', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('renders a message for a coupon for a program', () => {
      let coupon = makeCoupon(makeProgram());
      assert.equal(makeCouponMessage(coupon), "You will get $50 off the cost for each course in this program.");
    });

    it('renders a message for a coupon for a course', () => {
      let coupon = makeCoupon(makeProgram());
      coupon.content_type = COUPON_CONTENT_TYPE_COURSE;
      let makeAmountMessageStub = sandbox.stub(couponFuncs, 'makeAmountMessage').returns('all of the money');
      let makeCouponTargetMessageStub = sandbox.stub(couponFuncs, 'makeCouponReason').returns(', because why not');
      assert.equal(
        makeCouponMessage(coupon),
        "You will get all of the money off the cost for this course, because why not.",
      );
      assert.isTrue(makeAmountMessageStub.calledWith(coupon));
      assert.isTrue(makeCouponTargetMessageStub.calledWith(coupon));
    });

    it('renders a message for a coupon for an unknown content type', () => {
      let coupon = makeCoupon(makeProgram());
      coupon.content_type = 'xyz';
      assert.equal(makeCouponMessage(coupon), "");
    });

    it('renders a message for a coupon for a fixed price', () => {
      let coupon = makeCoupon(makeProgram());
      coupon.amount_type = COUPON_AMOUNT_TYPE_FIXED_PRICE;
      assert.equal(makeCouponMessage(coupon), "All courses are set to the discounted price of $50.");
    });

    it('renders a message for a course coupon for a fixed price', () => {
      let program = makeProgram();
      let course = program.courses[0];
      let coupon = makeCourseCoupon(course, program);
      coupon.amount_type = COUPON_AMOUNT_TYPE_FIXED_PRICE;
      assert.equal(makeCouponMessage(coupon), "This course is set to the discounted price of $50.");
    });
  });
});
