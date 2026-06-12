// @flow
/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import Button from "@material-ui/core/Button"
import Grid from "@material-ui/core/Grid"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import SocialAuthDialog from "./SocialAuthDialog"
import { COURSEWARE_BACKEND_NAMES } from "../constants"
import { makeAvailableProgram } from "../factories/dashboard"

import type { AvailableProgram } from "../flow/enrollmentTypes"

describe("SocialAuthDialog", () => {
  const renderDialog = (enrollment: AvailableProgram) =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <SocialAuthDialog currentProgramEnrollment={enrollment} />
      </MuiThemeProvider>
    )
      .find(SocialAuthDialog)
      .children()

  Object.entries(COURSEWARE_BACKEND_NAMES).forEach(
    ([missingBackend, backendLabel]) => {
      describe(`for missing backend '${missingBackend}'`, () => {
        let authenticatedEnrollment,
          unauthenticatedEnrollment,
          availablePrograms

        beforeEach(() => {
          availablePrograms = Object.keys(COURSEWARE_BACKEND_NAMES)
          SETTINGS.user.social_auth_providers = availablePrograms.filter(
            backend => backend !== missingBackend
          )
          authenticatedEnrollment = makeAvailableProgram(
            undefined,
            availablePrograms
          )
          unauthenticatedEnrollment = makeAvailableProgram(
            undefined,
            availablePrograms.filter(backend => backend === missingBackend)
          )
        })

        it("should be closed if the learner is authenticated with the backend", () => {
          SETTINGS.user.social_auth_providers = availablePrograms
          const wrapper = renderDialog(authenticatedEnrollment)
          assert.isBoolean(wrapper.prop("open"))
          assert.notOk(wrapper.prop("open"))
        })

        it("should be open if the learner is not authenticated with the backend", () => {
          const wrapper = renderDialog(unauthenticatedEnrollment)
          assert.isBoolean(wrapper.prop("open"))
          assert.ok(wrapper.prop("open"))
        })

        it("should have a continue button linking to the social auth login url", () => {
          const wrapper = renderDialog(unauthenticatedEnrollment)
          const btn = wrapper.find(Button)
          assert.ok(btn.exists())
          assert.equal(btn.prop("href"), `/login/${missingBackend}/`)
          assert.equal(btn.text(), `Continue to ${String(backendLabel)}`)
        })

        it("should have a description of what the learner needs to do", () => {
          const wrapper = renderDialog(unauthenticatedEnrollment)
          const text = wrapper
            .find(Grid)
            .at(0)
            .text()
          assert.equal(
            text,
            `Courses for ${
              unauthenticatedEnrollment.title
            } are offered on ${String(
              backendLabel
            )}. Continue to create a new account and link it to your current MicroMasters account.`
          )
        })
      })
    }
  )
})
