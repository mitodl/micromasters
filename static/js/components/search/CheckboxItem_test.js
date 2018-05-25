// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import sinon from "sinon"
import { shallow } from "enzyme"

import CheckboxItem from "./CheckboxItem"

describe("CheckboxItem", () => {
  const renderSemesterOption = () => shallow(<CheckboxItem {...props} />)

  let props

  beforeEach(() => {
    props = {
      onClick: sinon.stub(),
      label:   "2016 - Summer",
      active:  false,
      count:   42
    }
  })

  it("should render a label", () => {
    const option = renderSemesterOption()
    assert.include(option.text(), "2016 - Summer")
  })

  it("should render a semester placeholder, given no semester code", () => {
    props.label = ""
    const option = renderSemesterOption()
    assert.include(option.text(), "N/A")
  })

  it("should display the result count for the option", () => {
    const option = renderSemesterOption()
    assert.include(option.text(), "42")
  })

  it("should bind an onClick handler", () => {
    renderSemesterOption().simulate("click")
    assert(props.onClick.called, "onClick handler wasn't called")
  })
})
