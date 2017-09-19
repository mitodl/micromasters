// @flow
/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider"
import getMuiTheme from "material-ui/styles/getMuiTheme"

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

  let renderCard = (program = DASHBOARD_RESPONSE.programs[0], price = 1000) =>
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
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
    let card = renderCard()
    assert.include(
      stringStrip(card.text()),
      `Progress ${DASHBOARD_RESPONSE.programs[0].title}`
    )
  })

  const dataSet = [
    {
      price:   1000,
      display: "$1000"
    },
    {
      price:   0,
      display: "$0"
    }
  ]

  for (let data of dataSet) {
    it(`should have the program price ${data.display}`, () => {
      let card = renderCard(DASHBOARD_RESPONSE.programs[0], data.price)
      let price = card.find(".course-price .program-badge").text()
      assert.equal(price, data.display)
    })
  }

  it("should render the progress display", () => {
    let card = renderCard()
    assert.include(stringStrip(card.text()), "1 4 Courses complete")
  })

  it("should show average grade, if present", () => {
    let program = { ...DASHBOARD_RESPONSE.programs[0] }
    program.grade_average = 62
    let badge = renderCard(program).find(
      ".average-program-grade .program-badge"
    )
    assert.equal(badge.text(), "62%")
  })

  it('should show "--" if the grade is not present', () => {
    let badge = renderCard().find(".average-program-grade .program-badge")
    assert.equal(badge.text(), "--")
  })
})
