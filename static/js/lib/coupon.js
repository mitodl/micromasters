// @flow
import Decimal from "decimal.js-light"
import R from "ramda"

import {
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_PRICE,
  COUPON_TYPE_DISCOUNTED_PREVIOUS_COURSE
} from "../constants"
import type {
  Coupons,
  Coupon,
  CouponObject,
  CouponPrices
} from "../flow/couponTypes"
import type { CoursePrice, CoursePrices } from "../flow/dashboardTypes"
import type { Program } from "../flow/programTypes"

const isTypeCoupon = R.curry(
  (type: string, coupon: Coupon, obj: CouponObject) =>
    coupon && coupon.content_type === type && coupon.object_id === obj.id
)

const isProgramCoupon = isTypeCoupon(COUPON_CONTENT_TYPE_PROGRAM)
const isCourseCoupon = isTypeCoupon(COUPON_CONTENT_TYPE_COURSE)

// For objects that have a program id, make a lookup for it
type HasProgramId = {
  program_id: number
}
function makeProgramIdLookup<T: HasProgramId>(arr: Array<T>): Map<number, T> {
  return new Map(arr.map((value: T) => [value.program_id, value]))
}

// This calculates coupon adjusted prices (and unadjusted prices) for all programs, courses, and course runs.
export const calculatePrices = (
  programs: Array<Program>,
  prices: CoursePrices,
  coupons: Coupons
): CouponPrices => {
  const couponLookup: Map<number, Coupon> = makeProgramIdLookup(coupons)
  const priceLookup: Map<number, CoursePrice> = makeProgramIdLookup(prices)

  const pricesInclCouponByRun = new Map()
  const pricesInclCouponByCourse = new Map()
  const pricesInclCouponByProgram = new Map()
  const pricesExclCouponByProgram = new Map()

  for (const program of programs) {
    const priceObj = priceLookup.get(program.id)
    if (!priceObj) {
      // Shouldn't get here, we should only be calling this function
      // if we retrieved all the values from the API already
      throw new Error("Unable to find program to get the price")
    }
    const originalPrice = priceObj.price
    // Currently only one coupon per program is allowed, even if that coupon only affects one course
    const coupon = couponLookup.get(program.id)
    const priceExclCoupon = {
      price:  originalPrice,
      coupon: null
    }
    const priceInclCoupon = coupon
      ? {
        price: calculateDiscount(
          originalPrice,
          coupon.amount_type,
          coupon.amount
        ),
        coupon: coupon
      }
      : priceExclCoupon

    const priceExclCouponByProgram = priceExclCoupon
    const priceInclCouponByProgram = isProgramCoupon(coupon, program)
      ? priceInclCoupon
      : priceExclCoupon

    for (const course of program.courses) {
      // will be either the course coupon price, the program coupon price, or the original price
      const priceInclCouponByCourse = isCourseCoupon(coupon, course)
        ? priceInclCoupon
        : priceInclCouponByProgram

      for (const run of course.runs) {
        // there are no run-specific coupons
        pricesInclCouponByRun.set(run.id, priceInclCouponByCourse)
      }
      pricesInclCouponByCourse.set(course.id, priceInclCouponByCourse)
    }
    pricesInclCouponByProgram.set(program.id, priceInclCouponByProgram)
    pricesExclCouponByProgram.set(program.id, priceExclCouponByProgram)
  }

  return {
    pricesInclCouponByRun,
    pricesInclCouponByCourse,
    pricesInclCouponByProgram,
    pricesExclCouponByProgram
  }
}

export const _calculateDiscount = (
  price: Decimal,
  amountType: string,
  amount: Decimal
): Decimal => {
  let newPrice = price
  switch (amountType) {
  case COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT:
    newPrice = price.times(Decimal("1").minus(amount))
    break
  case COUPON_AMOUNT_TYPE_FIXED_DISCOUNT:
    newPrice = price.minus(amount)
    break
  case COUPON_AMOUNT_TYPE_FIXED_PRICE:
    newPrice = amount
    break
  }
  if (newPrice.lessThan(0)) {
    newPrice = Decimal("0")
  }
  if (newPrice.greaterThan(price)) {
    newPrice = price
  }
  return newPrice
}
// allow mocking of function
export { _calculateDiscount as calculateDiscount }
import { calculateDiscount } from "./coupon"

export function _makeAmountMessage(coupon: Coupon): string {
  switch (coupon.amount_type) {
  case COUPON_AMOUNT_TYPE_FIXED_DISCOUNT:
  case COUPON_AMOUNT_TYPE_FIXED_PRICE:
    return `$${coupon.amount}`
  case COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT:
    return `${coupon.amount
      .times(100)
      .toDecimalPlaces(0)
      .toString()}%`
  default:
    return ""
  }
}
// allow mocking of function
export { _makeAmountMessage as makeAmountMessage }
import { makeAmountMessage } from "./coupon"

export function _makeCouponReason(coupon: Coupon): string {
  if (coupon.coupon_type === COUPON_TYPE_DISCOUNTED_PREVIOUS_COURSE) {
    return ", because you have taken it before"
  } else {
    return ""
  }
}
// allow mocking of function
export { _makeCouponReason as makeCouponReason }
import { makeCouponReason } from "./coupon"

export const _couponMessageText = (coupon: Coupon) => {
  const isDiscount =
    coupon.amount_type === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT ||
    coupon.amount_type === COUPON_AMOUNT_TYPE_FIXED_DISCOUNT

  if (isDiscount) {
    if (coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
      return `You will get ${makeAmountMessage(
        coupon
      )} off the cost for each course in this program`
    } else if (coupon.content_type === COUPON_CONTENT_TYPE_COURSE) {
      return `You will get ${makeAmountMessage(
        coupon
      )} off the cost for this course`
    }
  } else {
    if (coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
      return `All courses are set to the discounted price of ${makeAmountMessage(
        coupon
      )}`
    } else if (coupon.content_type === COUPON_CONTENT_TYPE_COURSE) {
      return `This course is set to the discounted price of ${makeAmountMessage(
        coupon
      )}`
    }
  }
  return ""
}

// allow mocking of function
export { _couponMessageText as couponMessageText }
import { couponMessageText } from "./coupon"

export function makeCouponMessage(coupon: Coupon): string {
  const message = `${couponMessageText(coupon)}${makeCouponReason(coupon)}`
  if (message) {
    return `${message}.`
  } else {
    return ""
  }
}

export function isFreeCoupon(coupon: Coupon): boolean {
  return !!(
    coupon &&
    coupon.amount_type === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT &&
    coupon.amount.equals(1)
  )
}
