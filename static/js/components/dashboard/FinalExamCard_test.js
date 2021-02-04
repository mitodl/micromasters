// @flow
/* global SETTINGS: false */
import _ from "lodash"
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import FinalExamCard from "./FinalExamCard"
import { DASHBOARD_RESPONSE, USER_PROFILE_RESPONSE } from "../../test_constants"
import { PEARSON_PROFILE_ABSENT } from "../../constants"
import { INITIAL_UI_STATE } from "../../reducers/ui"
import { stringStrip, getEl } from "../../util/test_utils"
import type { Program } from "../../flow/programTypes"

describe("FinalExamCard", () => {
  let sandbox
  let props

  const profile = { ...USER_PROFILE_RESPONSE, preferred_name: "Preferred Name" }

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    const program: Program = (_.cloneDeep(
      DASHBOARD_RESPONSE.programs.find(
        program => program.exam_card_status !== undefined
      )
    ): any)
    props = {
      profile: profile,
      program: program,
      ui:      { ...INITIAL_UI_STATE }
    }
  })

  const commonText = `To earn a certificate, you must take an online proctored exam for each 
  course. Before you can take a proctored exam, you have to pay for the course and pass the online work.`

  const renderCard = props =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <FinalExamCard {...props} />
      </MuiThemeProvider>
    )

  it("should not render when exam_card_status is empty", () => {
    const card = renderCard(props)
    assert.equal(card.html(), "")
  })

  it("should just show a basic message if the profile is absent", () => {
    props.program.exam_card_status = PEARSON_PROFILE_ABSENT
    const card = renderCard(props)
    assert.include(stringStrip(card.text()), stringStrip(commonText))
  })
})
