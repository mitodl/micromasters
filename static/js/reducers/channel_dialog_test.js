// @flow
import R from "ramda"
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { FETCH_SUCCESS, FETCH_FAILURE } from "../actions"
import {
  startChannelEdit,
  updateChannelEdit,
  clearChannelEdit,
  createChannel,
  START_CHANNEL_EDIT,
  UPDATE_CHANNEL_EDIT,
  CLEAR_CHANNEL_EDIT,
  INITIATE_CREATE_CHANNEL,
  CREATE_CHANNEL_SUCCESS,
  CREATE_CHANNEL_FAILURE
} from "../actions/channels"
import { INITIAL_CHANNEL_STATE } from "./channel_dialog"

describe("channel_dialog reducers", () => {
  let helper, store, dispatchThen

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    store = helper.store
    dispatchThen = helper.store.createDispatchThen(state => state.channelDialog)
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
    const updatedInputs = R.clone(INITIAL_CHANNEL_STATE.inputs)
    updatedInputs.title = "Channel title"
    const state = await dispatchThen(
      updateChannelEdit({ inputs: updatedInputs }),
      [UPDATE_CHANNEL_EDIT]
    )
    assert.deepEqual(state, {
      ...INITIAL_CHANNEL_STATE,
      inputs:           updatedInputs,
      validationErrors: R.dissoc("title", VALIDATION_ERRORS)
    })
  })

  it("should clear the channel_dialog edit", async () => {
    const state = await dispatchThen(clearChannelEdit(), [CLEAR_CHANNEL_EDIT])
    assert.deepEqual(state, INITIAL_CHANNEL_STATE)
  })
})

describe("channel_dialog reducers for the createChannel action", () => {
  let helper, createFuncStub, dispatchThen
  const createArgs = [
    {
      name:               "name",
      title:              "title",
      public_description: "public_description",
      channel_type:       "private"
    }
  ]

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    createFuncStub = helper.sandbox.stub()
    dispatchThen = helper.store.createDispatchThen(state => state.channelDialog)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should go through expected state changes when the send function succeeds", async () => {
    createFuncStub.returns(Promise.resolve(true))
    const state = await dispatchThen(
      createChannel(createFuncStub, createArgs),
      [INITIATE_CREATE_CHANNEL, CREATE_CHANNEL_SUCCESS]
    )
    assert.equal(state.fetchStatus, FETCH_SUCCESS)
    assert.equal(createFuncStub.callCount, 1)
    assert.deepEqual(createFuncStub.args[0], createArgs)
  })

  it("should go through expected state changes when the send function fails", async () => {
    createFuncStub.returns(Promise.reject())

    const state = await dispatchThen(
      createChannel(createFuncStub, createArgs),
      [INITIATE_CREATE_CHANNEL, CREATE_CHANNEL_FAILURE]
    )
    assert.equal(state.fetchStatus, FETCH_FAILURE)
    assert.equal(createFuncStub.callCount, 1)
    assert.deepEqual(createFuncStub.args[0], createArgs)
  })
})
