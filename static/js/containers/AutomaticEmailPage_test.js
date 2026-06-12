// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import ReactTestUtils from "react-dom/test-utils"
import fetchMock from "fetch-mock"

import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../lib/redux_rest.js"
import { GET_AUTOMATIC_EMAILS_RESPONSE } from "../test_constants"
import { DASHBOARD_SUCCESS_ACTIONS } from "./test_util"
import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS
} from "../actions/profile"
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
} from "../actions/programs"
import CircularProgress from "@material-ui/core/CircularProgress"
import { UPDATE_EMAIL_VALIDATION, CLEAR_EMAIL_EDIT } from "../actions/email"
import { HIDE_DIALOG } from "../actions/ui"

describe("AutomaticEmailPage", () => {
  let renderComponent, helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderComponent = helper.renderComponent.bind(helper)

    SETTINGS.roles = [
      {
        role:        "staff",
        program:     1,
        permissions: []
      }
    ]
  })

  afterEach(() => {
    helper.cleanup()
  })

  const baseActions = [
    REQUEST_GET_USER_PROFILE,
    RECEIVE_GET_USER_PROFILE_SUCCESS,
    REQUEST_GET_PROGRAM_ENROLLMENTS,
    RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
  ]

  const successActions = baseActions.concat(
    actions.automaticEmails.get.requestType,
    actions.automaticEmails.get.successType
  )

  it("redirects you to /dashboard if you are not staff", () => {
    SETTINGS.roles = []
    const expectedActions = DASHBOARD_SUCCESS_ACTIONS.concat(
      actions.automaticEmails.get.requestType,
      actions.automaticEmails.get.successType
    )
    return renderComponent("/automaticemails", expectedActions).then(() => {
      assert.equal(window.location.pathname, "/dashboard")
    })
  })

  it("has all the cards it should", () => {
    return renderComponent("/automaticemails", successActions).then(
      ([wrapper]) => {
        assert.lengthOf(wrapper.find(".email-campaigns-card").hostNodes(), 1)
      }
    )
  })

  it("shows a spinner while the email info request is in-flight", () => {
    helper.store.dispatch({ type: actions.automaticEmails.get.requestType })

    return renderComponent("/automaticemails", baseActions).then(
      ([wrapper]) => {
        assert.lengthOf(wrapper.find(CircularProgress), 1)
      }
    )
  })

  it("shows the automatic emails for the logged-in user", () => {
    return renderComponent("/automaticemails", successActions).then(
      ([wrapper]) => {
        const cardText = wrapper
          .find(".email-campaigns-card")
          .hostNodes()
          .text()
        GET_AUTOMATIC_EMAILS_RESPONSE.forEach(email => {
          assert.include(cardText, email.email_subject)
        })
      }
    )
  })

  it("shows a placeholder if there is no data", () => {
    // clear the previous automatic email mock set in IntegrationTestHelper
    fetchMock.restore()
    fetchMock.mock("/api/v0/mail/automatic_email/", () => ({
      body: JSON.stringify([])
    }))

    return renderComponent("/automaticemails", successActions).then(
      ([wrapper]) => {
        const cardText = wrapper.find(".empty-message").text()
        assert.equal(cardText, "You haven't created any Email Campaigns yet.")
      }
    )
  })

  it("should let you save an email", () => {
    fetchMock.mock(
      `/api/v0/mail/automatic_email/${GET_AUTOMATIC_EMAILS_RESPONSE[0].id}/`,
      (url, opts) => {
        assert.equal(
          opts.body,
          JSON.stringify({
            email_subject:       GET_AUTOMATIC_EMAILS_RESPONSE[0].email_subject,
            email_body:          GET_AUTOMATIC_EMAILS_RESPONSE[0].email_body,
            sendAutomaticEmails: true,
            id:                  GET_AUTOMATIC_EMAILS_RESPONSE[0].id
          })
        )
        return { body: JSON.stringify(GET_AUTOMATIC_EMAILS_RESPONSE[0]) }
      }
    )

    return renderComponent("/automaticemails", successActions).then(
      ([wrapper]) => {
        const editButton = wrapper
          .find(".email-campaigns-card")
          .find(".email-row")
          .at(0)
          .find("a")
        editButton.simulate("click")
        // $FlowFixMe:
        const dialogSave = document
          .querySelector(".email-composition-dialog")
          .querySelector(".save-button")

        return helper.listenForActions(
          [
            UPDATE_EMAIL_VALIDATION,
            actions.automaticEmails.patch.requestType,
            actions.automaticEmails.patch.successType,
            CLEAR_EMAIL_EDIT,
            HIDE_DIALOG
          ],
          () => {
            ReactTestUtils.Simulate.click(dialogSave)
          }
        )
      }
    )
  })
})
