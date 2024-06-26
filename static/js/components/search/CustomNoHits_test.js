// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import sinon from "sinon"

import CustomNoHits from "./CustomNoHits"
import { makeStrippedHtml } from "../../util/util"

describe("CustomNoHits", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCustomNoHits = () => makeStrippedHtml(<CustomNoHits />)

  const stubCommon = (): void => {
    sandbox.stub(CustomNoHits.prototype, "componentDidMount")
    sandbox
      .stub(CustomNoHits.prototype, "getSuggestion")
      .returns("NoHits.NoResultsFound")
    sandbox
      .stub(CustomNoHits.prototype, "translate")
      .returns("No results found for search students")
    sandbox.stub(CustomNoHits.prototype, "isInitialLoading").returns(false)
    sandbox.stub(CustomNoHits.prototype, "isLoading").returns(false)
  }

  it("display when no search results", () => {
    stubCommon()
    sandbox
      .stub(CustomNoHits.prototype, "getQuery")
      .returns({ getQueryString: () => "search students" })
    sandbox.stub(CustomNoHits.prototype, "hasHits").returns(false)
    sandbox.stub(CustomNoHits.prototype, "getError").returns(false)

    const results = renderCustomNoHits()
    assert.equal(
      results,
      "There were no results found for this search. Please remove some filters or start over."
    )
  })

  it("hid when have search results", () => {
    stubCommon()
    sandbox
      .stub(CustomNoHits.prototype, "getQuery")
      .returns({ getQueryString: () => "test" })
    sandbox.stub(CustomNoHits.prototype, "hasHits").returns(true)
    sandbox.stub(CustomNoHits.prototype, "getError").returns(false)

    const results = renderCustomNoHits()
    assert.isNotOk(results)
  })

  it("when error in search results", () => {
    stubCommon()
    sandbox
      .stub(CustomNoHits.prototype, "getQuery")
      .returns({ getQueryString: () => "test" })
    sandbox.stub(CustomNoHits.prototype, "hasHits").returns(false)
    sandbox.stub(CustomNoHits.prototype, "getError").returns({
      data: {
        detail: "Error!!"
      }
    })

    const results = renderCustomNoHits()
    assert.equal(results, "Error!!")
  })
})
