// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import { Provider } from "react-redux"
import sinon from "sinon"
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider"
import getMuiTheme from "material-ui/styles/getMuiTheme"

import SendGradesDialog from "./SendGradesDialog";
import configureTestStore from "redux-asserts";
import rootReducer from "../reducers";
import {setSendDialogVisibility} from "../actions/send_grades_dialog";
import {getEl} from "../util/test_utils";
import ReactTestUtils from "react-dom/test-utils";

describe("SendGradesDialog", () => {
  let sandbox, store
  let sendStub

  const getDialog = () => document.querySelector(".send-dialog")
  beforeEach(() => {
    SETTINGS.partner_schools= [[1,"345"]]
    sandbox = sinon.sandbox.create()
    store = configureTestStore(rootReducer)
    // cancelStub = sandbox.stub()
    sendStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (open = true): HTMLElement => {
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Provider store={store}>
          <SendGradesDialog
          open={open}
          sendGradeEmailClick={sendStub}
          />
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

  it("should have a cancel button", () => {
    store.dispatch(setSendDialogVisibility(true))
    const dialogText = renderDialog()
    console.log(dialogText)
    console.log(dialogText.querySelector(".send-grades"))
    ReactTestUtils.Simulate.click(
      dialogText.querySelector(".send-grades")
    )
    assert.ok(sendStub.called, "cancel function should have been called")
  })

})

