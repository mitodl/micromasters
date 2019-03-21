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

describe("SendGradesDialog", () => {
  let sandbox, store
  let cancelStub, sendStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    store = configureTestStore(rootReducer)
    cancelStub = sandbox.stub()
    sendStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (props = {}) => {
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Provider store={store}>
          <SendGradesDialog {...props} />
        </Provider>
      </MuiThemeProvider>
    )
  }


  it("should have some text and a title", () => {
    const dialogText = renderDialog().textContent
    assert.include(dialogText, "Send Record to Partner")
    assert.include(dialogText, "You can directly share your program")
  })

})

