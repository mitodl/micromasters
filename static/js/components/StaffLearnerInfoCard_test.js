// @flow
/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import StaffLearnerInfoCard from "./StaffLearnerInfoCard"
import { DASHBOARD_RESPONSE } from "../test_constants"
import { stringStrip } from "../util/test_utils"
import { calculatePrices } from "../lib/coupon"

describe("StaffLearnerInfoCard", () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    SETTINGS.roles.push({ role: "staff" })
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCard = (program = DASHBOARD_RESPONSE.programs[0], price = 1000) =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <StaffLearnerInfoCard
          program={program}
          prices={calculatePrices(
            [program],
            [
              {
                program_id:                 program.id,
                price:                      price,
                financial_aid_availability: false,
                has_financial_aid_request:  false
              }
            ],
            []
          )}
          setShowGradeDetailDialog={() => undefined}
          dialogVisibility={{}}
        />
      </MuiThemeProvider>
    )

  it("should have the program title", () => {
    const card = renderCard()
    assert.include(
      stringStrip(card.text()),
      `Progress ${DASHBOARD_RESPONSE.programs[0].title}`
    )
  })

  it("should render the progress display", () => {
    const card = renderCard()
    assert.include(stringStrip(card.text()), "1 4 Courses complete")
  })

  it("should show average grade, if present", () => {
    const program = { ...DASHBOARD_RESPONSE.programs[0] }
    program.grade_average = 62
    const badge = renderCard(program).find(
      ".average-program-grade .program-badge"
    )
    assert.equal(badge.text(), "62%")
  })

  it('should show "--" if the grade is not present', () => {
    const badge = renderCard().find(".average-program-grade .program-badge")
    assert.equal(badge.text(), "--")
  })
})
