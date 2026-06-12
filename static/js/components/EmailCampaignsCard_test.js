// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import Switch from "@material-ui/core/Switch"
import CircularProgress from "@material-ui/core/CircularProgress"

import EmailCampaignsCard from "./EmailCampaignsCard"
import { GET_AUTOMATIC_EMAILS_RESPONSE } from "../test_constants"
import { S } from "../lib/sanctuary"

describe("EmailCampaignsCard", () => {
  let emailCardProps, sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    emailCardProps = {
      getEmails:         sandbox.stub(),
      emailsInFlight:    new Set(),
      toggleEmailActive: sandbox.stub(),
      openEmailComposer: sandbox.stub()
    }

    emailCardProps.getEmails.returns(S.Right(GET_AUTOMATIC_EMAILS_RESPONSE))
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCard = (props = emailCardProps) =>
    mount(<EmailCampaignsCard {...props} />)

  const headers = ["Email name / subject", "Start date", "Stop date", "Active"]

  it("should render all emails and header text, if Right", () => {
    const cardText = renderCard().text()
    GET_AUTOMATIC_EMAILS_RESPONSE.forEach(email => {
      assert.include(cardText, email.email_subject)
    })
    headers.forEach(header => {
      assert.include(cardText, header)
    })
  })

  it("should render an error message and no header text, if Left", () => {
    emailCardProps.getEmails.returns(S.Left(<div>I'm a message</div>))
    const cardText = renderCard().text()
    assert.include(cardText, "I'm a message")
    headers.forEach(header => {
      assert.notInclude(cardText, header)
    })
  })

  it("should render a switch, and call toggleEmailActive on click", () => {
    const card = renderCard()
    card
      .find(Switch)
      .first()
      .props()
      .onChange()
    assert(
      emailCardProps.toggleEmailActive.calledWith(
        GET_AUTOMATIC_EMAILS_RESPONSE[0]
      )
    )
  })

  it('should render an "edit" button, and call openEmailComposer with the AutomaticEmail on click', () => {
    const card = renderCard()
    card
      .find("a")
      .first()
      .simulate("click")
    assert(
      emailCardProps.openEmailComposer.calledWith(
        GET_AUTOMATIC_EMAILS_RESPONSE[0]
      )
    )
  })

  it("should show a spinner when a request is in-flight", () => {
    emailCardProps.emailsInFlight.add(GET_AUTOMATIC_EMAILS_RESPONSE[0].id)
    const card = renderCard()
    assert.lengthOf(card.find(CircularProgress), 1)
  })
})
