// @flow
import { assert } from "chai"
import moment from "moment"
import { S } from "../sanctuary"
const { Just } = S

import {
  sanitizeNumberString,
  checkYearRange,
  checkMonthRange,
  checkDayRange,
  validateDay,
  validateMonth,
  validateYear,
  validateNearFutureYear
} from "./date"
import { YEAR_VALIDATION_CUTOFF } from "../../constants"
import { assertMaybeEquality, assertIsNothing } from "../test_utils"

describe("Date validation", () => {
  describe("helper functions", () => {
    describe("sanitizeNumberString", () => {
      describe("string input", () => {
        it("should remove any non-numerical characters", () => {
          [
            ["-", 2, ""],
            ["-32", 2, "32"],
            ["asdf", 19, ""],
            ["A(*@$%!@#$100", 2, "10"],
            ["eggplant 1X00 hey", 10, "100"]
          ].forEach(([input, length, expectation]) => {
            assert.deepEqual(sanitizeNumberString(length, input), expectation)
          })
        })

        it("should trim the input down to the desired length", () => {
          [
            ["1999", 2, "19"],
            ["1x9", 2, "19"],
            ["1", 4, "1"],
            ["", 18318, ""],
            ["TESTS", 25, ""],
            ["1991", 0, ""]
          ].forEach(([input, length, expectation]) => {
            assert.deepEqual(sanitizeNumberString(length, input), expectation)
          })
        })

        it("should leave leading zeros when under the length", () => {
          assert.equal(sanitizeNumberString(2, "09"), "09")
        })

        it("should remove leading zeros when over the length", () => {
          assert.equal(sanitizeNumberString(4, "01999"), "1999")
        })
      })

      describe("numerical input", () => {
        it("should return a string", () => {
          assert.deepEqual(sanitizeNumberString(1, 3), "3")
        })

        it("should trim a number down to the correct number of places", () => {
          [
            [1999, 4, "1999"],
            [1999, 2, "19"],
            [112341234, 1, "1"]
          ].forEach(([input, length, expectation]) => {
            assert.deepEqual(sanitizeNumberString(length, input), expectation)
          })
        })
      })
    })

    describe("checkYearRange", () => {
      const currentYear = moment().year()
      const lowCutoff = currentYear - YEAR_VALIDATION_CUTOFF

      it("should return Just(low cutoff) if the year is too low", () => {
        assertMaybeEquality(
          Just(lowCutoff),
          checkYearRange(currentYear, lowCutoff - 10)
        )
      })

      it("should return the input if the year is between the cutoffs", () => {
        assertMaybeEquality(
          Just(lowCutoff + 5),
          checkYearRange(currentYear, lowCutoff + 5)
        )
      })

      it("should return the high cutoff if the year is too high", () => {
        assertMaybeEquality(
          Just(currentYear),
          checkYearRange(currentYear, currentYear + 10)
        )
      })
    })

    describe("checkMonthRange", () => {
      it("should return 12 at most", () => {
        assertMaybeEquality(Just(12), checkMonthRange(25))
      })

      it("should return x when 1 <= x <= 12", () => {
        for (let i = 1; i < 13; i++) {
          assertMaybeEquality(Just(i), checkMonthRange(i))
        }
      })
    })

    describe("checkDayRange", () => {
      it("should return 31 at most", () => {
        assertMaybeEquality(Just(31), checkDayRange(35))
      })

      it("should return x when 1 <= x <= 31", () => {
        for (let i = 1; i < 32; i++) {
          assertMaybeEquality(Just(i), checkDayRange(i))
        }
      })
    })
  })

  describe("validateMonth", () => {
    it("handles months starting with 0 without treating as octal", () => {
      assertMaybeEquality(Just(9), validateMonth("09"))
    })

    it("converts strings to numbers", () => {
      for (let i = 1; i < 13; i++) {
        assertMaybeEquality(Just(i), validateMonth(String(i)))
      }
    })

    it("strips out any non-numerical characters", () => {
      assertMaybeEquality(Just(12), validateMonth("1e2"))
      assertMaybeEquality(Just(4), validateMonth("0-4"))
      assertMaybeEquality(Just(3), validateMonth("-3"))
    })

    it("returns 12 for any number >= 12", () => {
      assertMaybeEquality(Just(12), validateMonth("3.4"))
      assertMaybeEquality(Just(12), validateMonth("13"))
    })

    it("will let a user input a leading zero", () => {
      assertMaybeEquality(Just(0), validateMonth("0"))
      assertMaybeEquality(Just(8), validateMonth("08"))
    })

    it("returns Nothing if the text is not an integer number", () => {
      assertIsNothing(validateMonth(""))
      assertIsNothing(validateMonth("two"))
      assertIsNothing(validateMonth(null))
      assertIsNothing(validateMonth({}))
      assertIsNothing(validateMonth(undefined))
    })
  })

  describe("year validation functions", () => {
    [
      [validateYear, "validateYear"],
      [validateNearFutureYear, "validateNearFutureYear"]
    ].forEach(([func, name]) => {
      describe(`basic validation for ${name}`, () => {
        it("handles years starting with 0 without treating as octal", () => {
          assertMaybeEquality(Just(1999), func("01999"))
        })

        it("converts strings to numbers", () => {
          assertMaybeEquality(Just(1943), func("1943"))
        })

        it("strips non-numerical characters", () => {
          assertMaybeEquality(Just(2004), func("2e004"))
          assertMaybeEquality(Just(2014), func("201-4"))
        })

        it("returns values for years less than 1800 if they are less than 4 character", () => {
          assertMaybeEquality(Just(3), func("3"))
          assertMaybeEquality(Just(703), func("703"))
          assertMaybeEquality(Just(0), func("0"))
          assertMaybeEquality(Just(20), func("-20"))
        })

        it(`returns a minimum of ${YEAR_VALIDATION_CUTOFF} years ago`, () => {
          const cutoff = moment()
            .subtract(YEAR_VALIDATION_CUTOFF, "years")
            .year()
          assertMaybeEquality(Just(cutoff), func(`${cutoff - 5}`))
        })

        it("returns an empty string if the text is not an integer number", () => {
          assertIsNothing(func(""))
          assertIsNothing(func("two"))
          assertIsNothing(func(null))
          assertIsNothing(func("@#"))
          assertIsNothing(func({}))
          assertIsNothing(func(undefined))
        })
      })
    })

    it("validateYear returns a maximum of the current year", () => {
      const now = moment().year()
      assertMaybeEquality(Just(now), validateYear(`${now + 3}`))
    })

    it("validateNearFutureYear returns a maximum of the current year + 10", () => {
      const now = moment().year()
      assertMaybeEquality(Just(now + 3), validateNearFutureYear(`${now + 3}`))
      assertMaybeEquality(Just(now + 10), validateNearFutureYear(`${now + 45}`))
    })
  })

  describe("validateDay", () => {
    it("handles dates starting with 0 without treating as octal", () => {
      assertMaybeEquality(Just(1), validateDay("01"))
    })

    it("converts strings to numbers", () => {
      assertMaybeEquality(Just(3), validateDay("3"))
    })

    it("allows leading zeros", () => {
      assertMaybeEquality(Just(0), validateDay("0"))
      assertMaybeEquality(Just(1), validateDay("01"))
    })

    it("disallows non-numerical input", () => {
      assertMaybeEquality(Just(3), validateDay("-3"))
      assertMaybeEquality(Just(20), validateDay("2e0"))
      assertMaybeEquality(Just(21), validateDay("2-1"))
      assertMaybeEquality(Just(22), validateDay("2.2"))
    })

    it("returns 31 for dates greater than 31", () => {
      assertMaybeEquality(Just(31), validateDay("32"))
      assertMaybeEquality(Just(31), validateDay("71"))
    })

    it("truncates to the first 2 characters of input", () => {
      assertMaybeEquality(Just(22), validateDay("220"))
    })

    it("returns an empty string if the text is not an integer number", () => {
      assertIsNothing(validateDay(""))
      assertIsNothing(validateDay("two"))
      assertIsNothing(validateDay(null))
      assertIsNothing(validateDay({}))
      assertIsNothing(validateDay(undefined))
    })
  })
})
