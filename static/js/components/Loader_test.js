/* global SETTINGS: false */
/* eslint-disable no-unused-vars */
import { assert } from "chai"
import { shallow } from "enzyme"
import React from "react"

import Loader from "./Loader"

describe("Loader", () => {
  const renderLoader = (props = {}) =>
    shallow(
      <Loader {...props}>
        <h1>Test</h1>
      </Loader>
    )
  const dataSet = [
    {
      shouldRenderAll:  true,
      childrenExpected: true,
      expectedMessage:  "render children"
    },
    {
      shouldRenderAll:  false,
      childrenExpected: false,
      expectedMessage:  "not render children"
    }
  ]

  for (const data of dataSet) {
    it(`should ${data.expectedMessage}`, () => {
      const wrapper = renderLoader({
        loaded:          false,
        shouldRenderAll: data.shouldRenderAll
      })
      assert.equal(wrapper.find(".loader").exists(), true)
      assert.equal(wrapper.find("h1").exists(), data.childrenExpected)
    })
  }

  it("should hide spiner", () => {
    const wrapper = renderLoader({ loaded: true })
    assert.equal(wrapper.find(".loader").exists(), false)
  })
})
