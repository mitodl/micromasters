// @flow
import { setDialogVisibility, SET_DIALOG_VISIBILITY } from "./signup_dialog"
import { assertCreatedActionHelper } from "./test_util"

describe("generated signup dialog action helpers", () => {
  it("should create all action creators", () => {
    [[setDialogVisibility, SET_DIALOG_VISIBILITY]].forEach(
      assertCreatedActionHelper
    )
  })
})
