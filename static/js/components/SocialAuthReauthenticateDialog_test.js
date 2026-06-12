// @flow
/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import Button from "@material-ui/core/Button"
import Grid from "@material-ui/core/Grid"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import SocialAuthReauthenticateDialog from "./SocialAuthReauthenticateDialog"
import { COURSEWARE_BACKEND_NAMES } from "../constants"

describe("SocialAuthReauthenticateDialog", () => {
  const renderDialog = (invalidBackendCredentials: string[]) =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <SocialAuthReauthenticateDialog
          invalidBackendCredentials={invalidBackendCredentials}
        />
      </MuiThemeProvider>
    )
      .find(SocialAuthReauthenticateDialog)
      .children()

  Object.entries(COURSEWARE_BACKEND_NAMES).forEach(
    ([invalidAuth, backendLabel]) => {
      describe(`for invalid credential '${invalidAuth}'`, () => {
        it("should be closed if the learner has no invalid credentials", () => {
          const wrapper = renderDialog([])
          assert.isBoolean(wrapper.prop("open"))
          assert.notOk(wrapper.prop("open"))
        })

        it("should be open if the learner has an invalid credential", () => {
          const wrapper = renderDialog([invalidAuth])
          assert.isBoolean(wrapper.prop("open"))
          assert.ok(wrapper.prop("open"))
        })

        it("should have a continue button linking to the social auth login url", () => {
          const wrapper = renderDialog([invalidAuth])
          const btn = wrapper.find(Button)
          assert.ok(btn.exists())
          assert.equal(btn.prop("href"), `/login/${invalidAuth}/`)
          assert.equal(btn.text(), `Continue to ${String(backendLabel)}`)
        })

        it("should have a description of what the learner needs to do", () => {
          const wrapper = renderDialog([invalidAuth])
          const text = wrapper
            .find(Grid)
            .at(0)
            .text()
          assert.equal(
            text,
            `Your account is linked to ${String(
              backendLabel
            )}, but this link is no longer active. Continue to log in with your account and relink it to your current MicroMasters account.`
          )
        })
      })
    }
  )
})
