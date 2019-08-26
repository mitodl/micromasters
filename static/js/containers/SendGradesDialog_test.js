/* global SETTINGS: false */
// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import { Provider } from "react-redux"
import sinon from "sinon"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import SendGradesDialog from "./SendGradesDialog"
import configureTestStore from "redux-asserts"
import rootReducer from "../reducers"
import {
  setSelectedSchool,
  setSendDialogVisibility
} from "../actions/send_grades_dialog"
import ReactTestUtils from "react-dom/test-utils"
import * as api from "../lib/api"

describe("SendGradesDialog", () => {
  let sandbox, store
  let sendGradesRecordMailStub

  beforeEach(() => {
    SETTINGS.partner_schools = [[1, "345"]]
    SETTINGS.hash = "enrollment_hash"
    sandbox = sinon.sandbox.create()
    store = configureTestStore(rootReducer)

    sendGradesRecordMailStub = sandbox.stub(api, "sendGradesRecordMail")
    sendGradesRecordMailStub.returns(Promise.resolve())
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (): HTMLElement => {
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <Provider store={store}>
          <SendGradesDialog />
        </Provider>
      </MuiThemeProvider>
    )
    return (document.querySelector(".send-dialog"): any)
  }

  it("should have some text and a title", () => {
    store.dispatch(setSendDialogVisibility(true))
    const dialogText = renderDialog().textContent

    assert.include(dialogText, "Send Record to Partner")
    assert.include(dialogText, "You can directly share your program")
  })

  it("should call sendGradeEmail", () => {
    store.dispatch(setSendDialogVisibility(true))
    store.dispatch(setSelectedSchool(1))
    const dialog = renderDialog()
    const sendButton = dialog.querySelector(".send-grades")
    ReactTestUtils.Simulate.click(sendButton)
    assert.isTrue(sendGradesRecordMailStub.called)
  })

  it("should close the dialog on cancel button", () => {
    store.dispatch(setSendDialogVisibility(true))
    const dialogText = renderDialog()
    ReactTestUtils.Simulate.click(
      dialogText.querySelector(".close-send-dialog")
    )
    assert.isFalse(store.getState().sendDialog.sendDialogVisibility)
  })
})
