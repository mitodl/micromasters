// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import Button from "@material-ui/core/Button"

import SpinnerButton from "./SpinnerButton"
import CircularProgress from "@material-ui/core/CircularProgress"

describe("SpinnerButton", () => {
  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("passes through all props when spinning is false", () => {
    const onClick = sandbox.stub()
    const props = {
      "data-x":  "y",
      onClick:   onClick,
      className: "class1 class2"
    }
    const wrapper = shallow(
      <SpinnerButton component="button" spinning={false} {...props}>
        childText
      </SpinnerButton>
    )
    const button = wrapper.find("button")
    const buttonProps = button.props()
    for (const key of Object.keys(props)) {
      if (key !== "onClick") {
        assert.deepEqual(buttonProps[key], props[key])
      }
    }
    assert.equal(button.children().text(), "childText")
    assert.isUndefined(buttonProps.disabled)
  })

  it("replaces children with a Spinner, disables onClick and updates className when spinning is true", () => {
    const onClick = sandbox.stub()
    const props = {
      "data-x": "y"
    }
    const wrapper = shallow(
      <SpinnerButton
        component={Button}
        spinning={true}
        onClick={onClick}
        className="class1 class2"
        {...props}
      >
        text
      </SpinnerButton>
    )
    wrapper.setState({
      recentlyClicked: true
    })
    const button = wrapper.find(Button)
    const buttonProps = button.props()
    for (const key of Object.keys(props)) {
      assert.deepEqual(buttonProps[key], props[key])
    }

    assert.isUndefined(buttonProps.onClick)
    assert.equal(buttonProps.className, "class1 class2 disabled-with-spinner")
    assert.equal(buttonProps["data-x"], "y")
    assert.isTrue(buttonProps.disabled)
    assert.equal(button.children().find(CircularProgress).length, 1)
  })

  it("shows the spinner is spinning is true, recentlyClicked is false, but ignoreRecentlyClicked is true", () => {
    const wrapper = shallow(
      <SpinnerButton
        component={Button}
        spinning={true}
        ignoreRecentlyClicked={true}
      >
        text
      </SpinnerButton>
    )
    wrapper.setState({
      recentlyClicked: false
    })
    const button = wrapper.find(Button)
    assert.equal(button.children().find(CircularProgress).length, 1)
  })

  it("does not show the spinner when it's disabled", () => {
    const wrapper = shallow(
      <SpinnerButton
        disabled={true}
        spinning={true}
        onClick={sandbox.stub()}
        component="button"
      >
        text
      </SpinnerButton>
    )
    const buttonProps = wrapper.find("button").props()

    assert.equal(buttonProps.className, undefined)
    assert.isTrue(buttonProps.disabled)
    assert.equal(buttonProps.onClick, undefined)
    assert.equal("text", wrapper.find("button").text())
  })

  it("sets recentlyClicked to true when the button is clicked", () => {
    const onClick = sandbox.stub()
    const wrapper = shallow(
      <SpinnerButton component="button" onClick={onClick} spinning={false} />
    )
    assert.isFalse(wrapper.state().recentlyClicked)
    const buttonProps = wrapper.find("button").props()
    buttonProps.onClick("args")
    assert.isTrue(onClick.calledWith("args"))
    assert.isTrue(wrapper.state().recentlyClicked)
  })

  it("does not show the spinner if spinning is true but recentlyClicked is false", () => {
    const onClick = sandbox.stub()
    const wrapper = shallow(
      <SpinnerButton spinning={true} component="button" onClick={onClick}>
        text
      </SpinnerButton>
    )
    const buttonProps = wrapper.find("button").props()
    assert.equal(buttonProps.className, undefined)
    assert.isTrue(buttonProps.disabled)
    assert.equal(buttonProps.onClick, undefined)
    assert.equal("text", wrapper.find("button").text())
  })

  it("sets recentlyClicked back to false if the spinning prop changes back to false", () => {
    const wrapper = shallow(
      <SpinnerButton component="button" spinning={true} />
    )
    wrapper.setState({
      recentlyClicked: true
    })
    wrapper.setProps({
      spinning: false
    })
    assert.isFalse(wrapper.state().recentlyClicked)
  })
})
