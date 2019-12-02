// @flow
import React from "react"
import sinon from "sinon"
import { mount } from "enzyme"
import { assert } from "chai"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import AutomaticEmailOptions from "./AutomaticEmailOptions"

describe("AutomaticEmailOptions", () => {
  let sandbox, setSendAutomaticEmailsStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    setSendAutomaticEmailsStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderComponent = (sendAutomaticEmails: boolean = false) =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <AutomaticEmailOptions
          setSendAutomaticEmails={setSendAutomaticEmailsStub}
          sendAutomaticEmails={sendAutomaticEmails}
        />
      </MuiThemeProvider>
    )

  it("should render a div", () => {
    const wrapper = renderComponent()
    assert.equal(wrapper.find(".send-one-time-email").hostNodes().length, 1)
    assert.equal(wrapper.find(".create-campaign").hostNodes().length, 1)
    const radioOneTime = wrapper.find("input").at(0)
    assert.isFalse(radioOneTime.prop("value"))
  })

  it("should be able to select email campaign", () => {
    const wrapper = renderComponent(true)
    assert.include(
      wrapper.text(),
      "This email will be sent now and in the future whenever users meet the criteria."
    )
    // test setEmailCompositionType is called when campaign selected
    const radioCampaign = wrapper.find("input").at(1)
    assert.isTrue(radioCampaign.prop("value"))
    radioCampaign.simulate("change")
    assert.isTrue(
      setSendAutomaticEmailsStub.called,
      "called set email composition type handler"
    )
  })
})
