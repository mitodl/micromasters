// @flow
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  START_EMAIL_EDIT,
  UPDATE_EMAIL_EDIT,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION
} from "./email"
import { assertCreatedActionHelper } from "./test_util"

describe("generated email action helpers", () => {
  it("should create all action creators", () => {
    [
      [startEmailEdit, START_EMAIL_EDIT],
      [updateEmailEdit, UPDATE_EMAIL_EDIT],
      [clearEmailEdit, CLEAR_EMAIL_EDIT],
      [updateEmailValidation, UPDATE_EMAIL_VALIDATION]
    ].forEach(assertCreatedActionHelper)
  })
})
