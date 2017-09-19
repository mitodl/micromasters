// @flow
import configureTestStore from "redux-asserts"
import sinon from "sinon"
import { assert } from "chai"

import { FETCH_FAILURE, FETCH_PROCESSING, FETCH_SUCCESS } from "../actions"
import {
  requestGetPearsonSSODigest,
  receiveGetPearsonSSOFailure,
  receiveGetPearsonSSOSuccess,
  setPearsonError,
  REQUEST_GET_PEARSON_SSO_DIGEST,
  RECEIVE_GET_PEARSON_SSO_FAILURE,
  RECEIVE_GET_PEARSON_SSO_SUCCESS,
  SET_PEARSON_ERROR
} from "../actions/pearson"
import { INITIAL_PEARSON_STATE } from "./pearson"
import rootReducer from "../reducers"

describe("pearson reducer", () => {
  let sandbox, store, dispatchThen

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    store = configureTestStore(rootReducer)
    dispatchThen = store.createDispatchThen(state => state.pearson)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should have some initial state", () => {
    return dispatchThen({ type: "unknown" }, ["unknown"]).then(state => {
      assert.deepEqual(state, INITIAL_PEARSON_STATE)
    })
  })

  it("should let you mark a request in flight", () => {
    return dispatchThen(requestGetPearsonSSODigest(), [
      REQUEST_GET_PEARSON_SSO_DIGEST
    ]).then(state => {
      assert.deepEqual(state, { getStatus: FETCH_PROCESSING, error: null })
    })
  })

  it("should let you mark a fetch error", () => {
    return dispatchThen(receiveGetPearsonSSOFailure(), [
      RECEIVE_GET_PEARSON_SSO_FAILURE
    ]).then(state => {
      assert.deepEqual(state, { getStatus: FETCH_FAILURE, error: null })
    })
  })

  it("should let you mark fetch success", () => {
    return dispatchThen(receiveGetPearsonSSOSuccess(), [
      RECEIVE_GET_PEARSON_SSO_SUCCESS
    ]).then(state => {
      assert.deepEqual(state, { getStatus: FETCH_SUCCESS, error: null })
    })
  })

  it("should let you set an error", () => {
    return dispatchThen(setPearsonError("AN ERROR OH NO"), [
      SET_PEARSON_ERROR
    ]).then(state => {
      assert.deepEqual(state, { getStatus: null, error: "AN ERROR OH NO" })
    })
  })
})
