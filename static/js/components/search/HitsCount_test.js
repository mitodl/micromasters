// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"

import HitsCount from "./HitsCount"
import { makeStrippedHtml } from "../../util/util"

describe("HitsCount", () => {
  let renderHitsCount = n => makeStrippedHtml(<HitsCount hitsCount={n} />)

  it("should take a number and render it", () => {
    let results = renderHitsCount(42)
    assert.deepEqual(results, "42 Results")
  })

  it("should render 'Result' when there's one result", () => {
    let results = renderHitsCount(1)
    assert.deepEqual(results, "1 Result")
  })
})
