import { assert } from "chai"
import { formatGrade } from "./util"

describe("formatGrade", () => {
  it("correctly formats a number-like grade", () => {
    let expected = "80%"
    assert.equal(formatGrade("80"), expected)
    assert.equal(formatGrade("80.4"), expected)
    assert.equal(formatGrade("79.6"), expected)
    assert.equal(formatGrade(80), expected)
    assert.equal(formatGrade(80.4), expected)
    assert.equal(formatGrade(79.6), expected)
  })

  it("returns a blank string with null/blank/invalid input", () => {
    let expected = ""
    assert.equal(formatGrade(""), expected)
    assert.equal(formatGrade(null), expected)
    assert.equal(formatGrade("abc"), expected)
  })
})
