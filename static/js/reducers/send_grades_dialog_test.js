import { assert } from "chai"
import sinon from "sinon"
import {
  SEND_GRADES_EMAIL_SUCCESS,
  SEND_GRADES_EMAIL_FAILURE,
  sendGradeEmail
} from "../actions/send_grades_dialog"
import rootReducer from "./index"
import configureTestStore from "redux-asserts"
import * as api from "../lib/api"

describe("email reducers for the sendGradeEmail action", function() {
  let dispatchThen, sandbox, store
  let sendGradeEmailStub
  const sendEmailArguments = [2, "45"]

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sendGradeEmailStub = sandbox.stub(api, "sendGradesRecordMail")
    store = configureTestStore(rootReducer)
    dispatchThen = store.createDispatchThen(state => state.sendDialog)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should go through expected state changes when the send function succeeds", () => {
    sendGradeEmailStub.returns(Promise.resolve())

    return dispatchThen(sendGradeEmail(sendEmailArguments), [
      SEND_GRADES_EMAIL_SUCCESS
    ]).then(state => {
      assert.equal(state.sentSuccess, true)
      assert.equal(sendGradeEmailStub.callCount, 1)
      assert.deepEqual(sendGradeEmailStub.args[0], [...sendEmailArguments])
    })
  })

  it("should go through expected state changes when the send function fails", () => {
    sendGradeEmailStub.returns(Promise.reject())
    return dispatchThen(sendGradeEmail(sendEmailArguments), [
      SEND_GRADES_EMAIL_FAILURE
    ]).then(state => {
      assert.equal(state.sentSuccess, false)
    })
  })
})
