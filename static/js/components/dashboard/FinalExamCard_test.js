// @flow
/* global SETTINGS: false */
import _ from "lodash"
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import IconButton from "@material-ui/core/IconButton"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import FinalExamCard from "./FinalExamCard"
import { DASHBOARD_RESPONSE, USER_PROFILE_RESPONSE } from "../../test_constants"
import {
  PEARSON_PROFILE_ABSENT,
} from "../../constants"
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
        program => program.pearson_exam_status !== undefined
      )
    ): any)
    props = {
      profile:              profile,
      program:              program,
      ui:                   { ...INITIAL_UI_STATE },
    }
  })

  const commonText = `You must take a proctored exam for each course. Exams may
be taken at any authorized Pearson test center. Before you can take an exam, you have to
pay for the course and pass the online work.`

  const getDialog = () => document.querySelector(".dialog-to-pearson-site")
  const renderCard = props =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <FinalExamCard {...props} />
      </MuiThemeProvider>
    )

  it("should not render when pearson_exam_status is empty", () => {
    const card = renderCard(props)
    assert.equal(card.html(), "")
  })

  it("should just show a basic message if the profile is absent", () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_ABSENT
    const card = renderCard(props)
    assert.include(stringStrip(card.text()), stringStrip(commonText))
    assert.notInclude(
      stringStrip(card.text()),
      "Your Pearson Testing account has been created"
    )
  })
})
