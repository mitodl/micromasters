import React from "react"
import R from "ramda"
import { mount } from "enzyme"
import { assert } from "chai"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import ReactTestUtils from "react-dom/test-utils"
import fetchMock from "fetch-mock"

import IntegrationTestHelper from "../../util/integration_test_helper"
import { withChannelCreateDialog } from "./withChannelCreateDialog"
import { actions } from "../../lib/redux_rest"
import { CHANNEL_CREATE_DIALOG } from "../../constants"
import { START_CHANNEL_EDIT, CLEAR_CHANNEL_EDIT } from "../../actions/channels"
import { SHOW_DIALOG, HIDE_DIALOG } from "../../actions/ui"
import { INITIAL_CHANNEL_STATE } from "../../reducers/channel_dialog"

describe("withChannelCreateDialog higher-order component", () => {
  let helper,
    listenForActions,
    searchkit,
    getSelectedFiltersSpy,
    buildQuerySpy,
    openSpy

  const getDialog = () => document.querySelector(".create-channel-dialog")

  class TestContainerPage extends React.Component {
    render() {
      const { openChannelCreateDialog } = this.props

      return (
        <div>
          <button
            onClick={R.partial(openChannelCreateDialog, [searchkit])}
            className="opener"
          >
            New Channel
          </button>
        </div>
      )
    }
  }

  const WrappedTestContainerPage = withChannelCreateDialog(TestContainerPage)

  const renderTestComponentWithDialog = ({
    channelDialog = INITIAL_CHANNEL_STATE,
    dialogVisible = false
  } = {}) =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <WrappedTestContainerPage
          dispatch={helper.store.dispatch}
          ui={{ dialogVisibility: { [CHANNEL_CREATE_DIALOG]: dialogVisible } }}
          channelDialog={{ ...channelDialog, searchkit }}
          currentProgramEnrollment={{}}
          channels={{ processing: false }}
        />
      </MuiThemeProvider>
    )

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listenForActions = helper.listenForActions.bind(helper)
    getSelectedFiltersSpy = helper.sandbox.stub()
    buildQuerySpy = helper.sandbox.stub().returns({
      query: {}
    })
    searchkit = {
      buildQuery: buildQuerySpy,
      query:      { getSelectedFilters: getSelectedFiltersSpy }
    }
    openSpy = helper.sandbox.stub(window, "open")
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render a channel create dialog when the wrapped component renders", () => {
    const wrapper = renderTestComponentWithDialog()
    assert.isTrue(wrapper.find("ChannelCreateDialog").exists())
  })

  it("should expose a function that lets the wrapped component launch the channel create dialog", async () => {
    const wrapper = renderTestComponentWithDialog()
    assert.isNotOk(
      helper.store.getState().ui.dialogVisibility[CHANNEL_CREATE_DIALOG]
    )
    const state = await listenForActions(
      [START_CHANNEL_EDIT, SHOW_DIALOG],
      () => {
        wrapper.find(".opener").simulate("click")
      }
    )
    assert.isTrue(getSelectedFiltersSpy.called)
    assert.isTrue(state.ui.dialogVisibility[CHANNEL_CREATE_DIALOG])
  })

  it("should close the dialog", async () => {
    renderTestComponentWithDialog({ dialogVisible: true })
    const state = await listenForActions(
      [CLEAR_CHANNEL_EDIT, HIDE_DIALOG],
      () => {
        ReactTestUtils.Simulate.click(
          getDialog().querySelector(".cancel-button")
        )
      }
    )
    assert.isFalse(state.ui.dialogVisibility[CHANNEL_CREATE_DIALOG])
  })

  it("should create the channel and close the dialog", async () => {
    fetchMock.mock("/api/v0/channels/", () => ({
      name:  "name",
      title: "title"
    }))

    renderTestComponentWithDialog({
      dialogVisible: true,
      channelDialog: {
        ...INITIAL_CHANNEL_STATE,
        inputs: {
          name:         "name",
          title:        "title",
          description:  "description",
          channel_type: "private"
        }
      }
    })

    const state = await listenForActions(
      [
        actions.channels.post.requestType,
        actions.channels.post.successType,
        CLEAR_CHANNEL_EDIT,
        HIDE_DIALOG
      ],
      () => {
        ReactTestUtils.Simulate.click(getDialog().querySelector(".save-button"))
      }
    )
    assert.isTrue(buildQuerySpy.called)
    assert.isTrue(openSpy.called)
    assert.isFalse(state.ui.dialogVisibility[CHANNEL_CREATE_DIALOG])
  })
})
