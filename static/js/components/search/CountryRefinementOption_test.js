// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import _ from "lodash"
import sinon from "sinon"
import ReactTestUtils from "react-dom/test-utils"

import CountryRefinementOption from "./CountryRefinementOption"
import { makeStrippedHtml } from "../../util/util"

describe("CountryRefinementOption", () => {
  let renderCountryOption = props =>
    makeStrippedHtml(<CountryRefinementOption {...props} />)

  let onClick = sinon.stub()
  let props = {
    label:   "AF",
    active:  false,
    onClick: onClick,
    count:   42
  }

  let renderFullCountryOption = props =>
    ReactTestUtils.renderIntoDocument(<CountryRefinementOption {...props} />)

  it("should render a country name, given a country code", () => {
    let option = renderCountryOption(props)
    assert.include(option, "Afghanistan")
  })

  it("should render a country placeholder, given no country code", () => {
    let newProps = _.cloneDeep(props)
    _.set(newProps, "label", null)
    let option = renderCountryOption(newProps)
    assert.include(option, "N/A")
  })

  it("should display the result count for the option", () => {
    let option = renderCountryOption(props)
    assert.include(option, "42")
  })

  it("should bind an onClick handler", () => {
    let componentTree = renderFullCountryOption(props)
    let clickableDiv = ReactTestUtils.findAllInRenderedTree(
      componentTree,
      () => true
    )[1]
    ReactTestUtils.Simulate.click(clickableDiv)
    assert(onClick.called, "onClick handler wasn't called")
  })
})
