// @flow
import R from "ramda"
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import {
  startChannelEdit,
  updateChannelEdit,
  updateChannelErrors,
  clearChannelEdit,
  START_CHANNEL_EDIT,
  UPDATE_CHANNEL_EDIT,
  UPDATE_CHANNEL_ERRORS,
  CLEAR_CHANNEL_EDIT
} from "../actions/channels"
import { INITIAL_CHANNEL_STATE } from "./channel_dialog"

describe("channel_dialog reducers", () => {
  let helper
  let store
  let dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = helper.store.createDispatchThen(
      (state) => state.channelDialog
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  const VALIDATION_ERRORS = {
    title: "Channel title is required",
    name:  "Channel name is required"
  }

  it("should let you start editing an channel", async () => {
    const state = await dispatchThen(startChannelEdit({}), [START_CHANNEL_EDIT])
    assert.deepEqual(state, {
      ...INITIAL_CHANNEL_STATE,
      validationErrors: VALIDATION_ERRORS
    })
  })

  it("should let you update a channel_dialog edit in progress", async () => {
    store.dispatch(startChannelEdit({}))
    const update = {
      inputs: {
        title: "Channel title"
      },
      validationVisibility: {
        title: true
      }
    }
    const state = await dispatchThen(updateChannelEdit(update), [
      UPDATE_CHANNEL_EDIT
    ])
    assert.deepEqual(state, {
      ...INITIAL_CHANNEL_STATE,
      inputs: {
        ...INITIAL_CHANNEL_STATE.inputs,
        ...update.inputs
      },
      validationErrors:     R.dissoc("title", VALIDATION_ERRORS),
      validationVisibility: {
        ...INITIAL_CHANNEL_STATE.validationVisibility,
        ...update.validationVisibility
      }
    })
  })

  it("should let you update a channel_dialog validation errors", async () => {
    store.dispatch(startChannelEdit({}))
    const state = await dispatchThen(updateChannelErrors(VALIDATION_ERRORS), [
      UPDATE_CHANNEL_ERRORS
    ])
    assert.deepEqual(state, {
      ...INITIAL_CHANNEL_STATE,
      validationErrors: VALIDATION_ERRORS
    })
  })

  it("should clear the channel_dialog edit", async () => {
    const state = await dispatchThen(clearChannelEdit(), [CLEAR_CHANNEL_EDIT])
    assert.deepEqual(state, INITIAL_CHANNEL_STATE)
  })
})
