import { assert } from "chai"

import {
  currencyForCountry,
  excludedCurrencyCodes,
  currencyOptions
} from "./currency"

describe("currency", () => {
  describe("currencyOptions", () => {
    it("shouldnt include any options in the excluded list", () => {
      excludedCurrencyCodes.forEach(code => {
        assert.isUndefined(
          currencyOptions.find(option => option.value === code)
        )
      })
    })
  })

  describe("currencyForCountry", () => {
    it("should return a valid currency code for a country", () => {
      [
        ["US", "USD"],
        ["AF", "AFN"],
        ["JP", "JPY"],
        ["FR", "EUR"],
        ["GB", "GBP"],
        ["IN", "INR"],
        [null, ""]
      ].forEach(([country, currency]) => {
        assert.equal(currencyForCountry(country), currency)
      })
    })

    it("should return an empty string if you give it nonsense", () => {
      assert.equal("", currencyForCountry("asdfasdf"))
    })

    it("should return an empty string if a countrys currency is in the excluded list", () => {
      ["UY", "CH", "SS"].forEach(country => {
        assert.equal("", currencyForCountry(country))
      })
    })
  })
})
