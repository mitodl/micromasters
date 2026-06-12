// @flow
import {
  SET_DIALOG_VISIBILITY,
  SEND_GRADES_EMAIL_FAILURE,
  SEND_GRADES_EMAIL_SUCCESS,
  SET_SELECTED_SCHOOL,
  setSelectedSchool,
  sendEmailFailure,
  sendEmailSuccess,
  setSendDialogVisibility
} from "./send_grades_dialog"
import { assertCreatedActionHelper } from "./test_util"

describe("generated send grades email action helpers", () => {
  it("should create all action creators", () => {
    [
      [setSelectedSchool, SET_SELECTED_SCHOOL],
      [setSendDialogVisibility, SET_DIALOG_VISIBILITY],
      [sendEmailSuccess, SEND_GRADES_EMAIL_SUCCESS],
      [sendEmailFailure, SEND_GRADES_EMAIL_FAILURE]
    ].forEach(assertCreatedActionHelper)
  })
})
