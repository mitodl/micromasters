// @flow
import { assert } from "chai"
import moment from "moment"

import { ifValidDate, formatMonthDate } from "./date"

describe("date utility functions", () => {
  const formatFunc = date => date.format("YYYY-MM-DD")
  const testFunc = ifValidDate("not valid", formatFunc)

  describe("ifValidDate", () => {
    it("should return the default value for an invalid date", () => {
      const invalidDate = moment("1978-13-39")
      assert.equal("not valid", testFunc(invalidDate))
    })

    it("should return fn(date) for a valid date", () => {
      const validDate = moment("1949-06-02")
      assert.equal("1949-06-02", testFunc(validDate))
    })
  })

  describe("formatMonthDate", () => {
    it("should format date as month/year", () => {
      assert.equal("06/1949", formatMonthDate("1949-06-02"))
    })

    it("should return an empty string for a nil value", () => {
      assert.equal("", formatMonthDate(null))
    })
  })
})
