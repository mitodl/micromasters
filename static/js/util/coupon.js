// @flow
import {
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_COURSERUN,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
} from '../constants';
import type {
  Coupons,
  Coupon,
  CalculatedPrices,
} from '../flow/couponTypes';
import type {
  CoursePrice,
  CoursePrices,
  Dashboard,
} from '../flow/dashboardTypes';

export const calculatePrices = (programs: Dashboard, prices: CoursePrices, coupons: Coupons): CalculatedPrices => {
  let couponLookup: Map<number, Coupon> = new Map();
  let priceLookup: Map<number, CoursePrice> = new Map();
  for (const coupon of coupons) {
    couponLookup.set(coupon.program_id, coupon);
  }
  for (const price of prices) {
    priceLookup.set(price.program_id, price);
  }

  return programs.map(program => ({
    id: program.id,
    courses: program.courses.map(course => ({
      id: course.id,
      runs: course.runs.map(run => ({
        id: run.id,
        price: mockableCalculateRunPrice(
          run.id, course.id, program.id, priceLookup.get(program.id), couponLookup.get(program.id)
        ),
      }))
    }))
  }));
};

export const calculateDiscount = (price: number, amountType: string, amount: number) => {
  switch (amountType) {
  case COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT:
    return price * (1 - amount);
  case COUPON_AMOUNT_TYPE_FIXED_DISCOUNT:
    return price - amount;
  default:
    return price;
  }
};

export const calculateRunPrice = (
  runId: number, courseId: number, programId: number, programPrice: ?CoursePrice, coupon: ?Coupon
): ?number => {
  if (!programPrice) {
    // don't have any price to calculate
    return null;
  }

  const startingPrice = programPrice.price;
  if (!coupon) {
    // don't have any discount to figure out
    return startingPrice;
  }

  if (
    (coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM && coupon.object_id === programId) ||
    (coupon.content_type === COUPON_CONTENT_TYPE_COURSE && coupon.object_id === courseId) ||
    (coupon.content_type === COUPON_CONTENT_TYPE_COURSERUN && coupon.object_id === runId)
  ) {
    return mockableCalculateDiscount(startingPrice, coupon.amount_type, coupon.amount);
  } else {
    // coupon doesn't match
    return startingPrice;
  }
};

// import to allow mocking in tests
import {
  calculateRunPrice as mockableCalculateRunPrice,
  calculateDiscount as mockableCalculateDiscount
} from './coupon';
