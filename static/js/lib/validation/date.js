// @flow
import R from "ramda"
import moment from "moment"

import { S, ifNil } from "../sanctuary"
const { Just, Nothing } = S
import { filterPositiveInt } from "../../util/util"
import { YEAR_VALIDATION_CUTOFF } from "../../constants"

/**
 * Removes non-numeric characters and truncates output string
 */
const digits = R.replace(/[^\d]+/g, "")

const trimLeadingZeros = (length, input) =>
  input.length <= length ? input : R.replace(/^0+/, "", input)

export const sanitizeNumberString = R.curry((length, input) =>
  R.slice(0, length, trimLeadingZeros(length, digits(String(input))))
)

/**
 * validate a day input
 */
export const checkDayRange = ifNil(day => (day > 31 ? Just(31) : Just(day)))

export const validateDay = R.compose(
  checkDayRange,
  filterPositiveInt,
  sanitizeNumberString(2)
)

/**
 * Validate a month input
 */
export const checkMonthRange = ifNil(month =>
  month > 12 ? Just(12) : Just(month)
)

export const validateMonth = R.compose(
  checkMonthRange,
  filterPositiveInt,
  sanitizeNumberString(2)
)

/**
 * Validate a year input
 *
 * checks to make sure a year n is in the range of
 * x - YEAR_VALIDATION_CUTOFF <= n <= highCutoff,
 * where x is moment().year()
 */
export const validYearInput = R.curry((highCutoff, year) => {
  if (year === undefined) {
    return Nothing
  } else {
    return String(year).length < 4
      ? Just(year)
      : checkYearRange(highCutoff, year)
  }
})

export const checkYearRange = (highCutoff: number, year: number) => {
  const now = moment().year()
  return Just(R.max(now - YEAR_VALIDATION_CUTOFF, R.min(highCutoff, year)))
}

export const validateYear = ifNil(
  R.compose(
    validYearInput(moment().year()),
    filterPositiveInt,
    sanitizeNumberString(4)
  )
)

/**
 * checks that year is valid, with years up to 10 years in the future being allowable
 */
export const validateNearFutureYear = ifNil(
  R.compose(
    validYearInput(
      moment()
        .add(10, "years")
        .year()
    ),
    filterPositiveInt,
    sanitizeNumberString(4)
  )
)
