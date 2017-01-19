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

// For objects that have a program id, make a lookup for it
type HasProgramId = {
  program_id: number
};
function makeProgramIdLookup<T: HasProgramId>(obj: Array<T>): Map<number, T> {
  return new Map(obj.map((value: T) => [value.program_id, value]));
}

export const calculatePrices = (programs: Dashboard, prices: CoursePrices, coupons: Coupons): CalculatedPrices => {
  let couponLookup: Map<number, Coupon> = makeProgramIdLookup(coupons);
  let priceLookup: Map<number, CoursePrice> = makeProgramIdLookup(prices);

  let calcPriceForRun = (run, course, program) => ({
    id: run.id,
    price: calculateRunPrice(
      run.id, course.id, program.id, priceLookup.get(program.id), couponLookup.get(program.id)
    ),
  });

  let calcPriceForCourse = (course, program) => ({
    id: course.id,
    runs: course.runs.map(run => calcPriceForRun(run, course, program))
  });

  let calcPriceForProgram = program => ({
    id: program.id,
    courses: program.courses.map(course => calcPriceForCourse(course, program))
  });

  return programs.map(calcPriceForProgram);
};

export const _calculateDiscount = (price: number, amountType: string, amount: number) => {
  switch (amountType) {
  case COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT:
    return price * (1 - amount);
  case COUPON_AMOUNT_TYPE_FIXED_DISCOUNT:
    return price - amount;
  default:
    return price;
  }
};
// allow mocking of function
export { _calculateDiscount as calculateDiscount };
import { calculateDiscount } from './coupon';

export const _calculateRunPrice = (
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
    return calculateDiscount(startingPrice, coupon.amount_type, coupon.amount);
  } else {
    // coupon doesn't match
    return startingPrice;
  }
};
// allow mocking of function
export { _calculateRunPrice as calculateRunPrice };
import { calculateRunPrice } from './coupon';
