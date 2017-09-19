/* global SETTINGS: false */
import { assert } from "chai"
import { shallow } from "enzyme"
import React from "react"

import Loader from "./Loader"

describe("Loader", () => {
  let renderLoader = (props = {}) =>
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

  for (let data of dataSet) {
    it(`should ${data.expectedMessage}`, () => {
      let wrapper = renderLoader({
        loaded:          false,
        shouldRenderAll: data.shouldRenderAll
      })
      assert.equal(wrapper.find(".loader").exists(), true)
      assert.equal(wrapper.find("h1").exists(), data.childrenExpected)
    })
  }

  it("should hide spiner", () => {
    let wrapper = renderLoader({ loaded: true })
    assert.equal(wrapper.find(".loader").exists(), false)
  })
})
