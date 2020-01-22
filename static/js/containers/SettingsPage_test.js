/* global SETTINGS: false */
import ReactTestUtils from "react-dom/test-utils"
import { assert } from "chai"
import _ from "lodash"

import {
  requestPatchUserProfile,
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS
} from "../actions/profile"
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  UNENROLL_PROGRAM_DIALOG
} from "../actions/programs"
import {
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  CLEAR_PROFILE_EDIT,
  UPDATE_VALIDATION_VISIBILITY,
  receiveGetUserProfileSuccess
} from "../actions/profile"
import { SHOW_DIALOG } from "../actions/ui"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as api from "../lib/api"
import { USER_PROFILE_RESPONSE } from "../test_constants"

describe("SettingsPage", function() {
  this.timeout(5000)
  const nextButtonSelector = ".next"
  let listenForActions, renderComponent, helper, patchUserProfileStub
  const userActions = [
    REQUEST_GET_PROGRAM_ENROLLMENTS,
    RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
    REQUEST_GET_USER_PROFILE,
    RECEIVE_GET_USER_PROFILE_SUCCESS,
    START_PROFILE_EDIT
  ]

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listenForActions = helper.listenForActions.bind(helper)
    renderComponent = helper.renderComponent.bind(helper)
    patchUserProfileStub = helper.sandbox.stub(api, "patchUserProfile")

    helper.profileGetStub.withArgs(SETTINGS.user.username).returns(
      Promise.resolve(_.cloneDeep(USER_PROFILE_RESPONSE), {
        username: SETTINGS.user.username
      })
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  const confirmSaveButtonBehavior = (
    updatedProfile,
    pageElements,
    validationFailure = false
  ) => {
    let { button } = pageElements
    const { div } = pageElements
    button = button || div.querySelector(nextButtonSelector)
    patchUserProfileStub.throws("Invalid arguments")
    patchUserProfileStub
      .withArgs(SETTINGS.user.username, updatedProfile)
      .returns(Promise.resolve(updatedProfile))

    const actions = []
    if (!validationFailure) {
      actions.push(
        REQUEST_PATCH_USER_PROFILE,
        RECEIVE_PATCH_USER_PROFILE_SUCCESS,
        START_PROFILE_EDIT,
        CLEAR_PROFILE_EDIT,
        UPDATE_VALIDATION_VISIBILITY
      )
    }
    actions.push(UPDATE_PROFILE_VALIDATION)
    return listenForActions(actions, () => {
      ReactTestUtils.Simulate.click(button)
    })
  }

  it("shows the privacy form", () => {
    return renderComponent("/settings", userActions).then(([, div]) => {
      const pageHeading = div.getElementsByClassName("privacy-form-heading")[0]
      assert.equal(pageHeading.textContent, "Settings")

      const question = div.getElementsByClassName("privacy-form-heading")[1]
      assert.equal(question.textContent, "Who can see your profile?")

      const emailPrefHeading = div.getElementsByClassName(
        "privacy-form-heading"
      )[2]
      assert.equal(emailPrefHeading.textContent, "Email Preferences")

      const otherSettingsHeading = div.getElementsByClassName("heading")[0]
      assert.equal(otherSettingsHeading.textContent, "Other Settings")
    })
  })

  describe("save privacy form", () => {
    it("save privacy changes", () => {
      return renderComponent("/settings", userActions).then(([, div]) => {
        const button = div.querySelector(nextButtonSelector)
        const receivedProfile = {
          ...USER_PROFILE_RESPONSE,
          account_privacy: "public",
          email_optin:     true
        }
        helper.store.dispatch(
          receiveGetUserProfileSuccess(SETTINGS.user.username, receivedProfile)
        )

        assert(button.innerHTML.includes("Save"))
        const updatedProfile = {
          ...receivedProfile,
          email_optin: true,
          filled_out:  true
        }
        return confirmSaveButtonBehavior(updatedProfile, { button: button })
      })
    })

    for (const activity of [true, false]) {
      it(`has proper button state when when profile patch activity is ${String(
        activity
      )}`, () => {
        return renderComponent("/settings", userActions).then(([wrapper]) => {
          if (activity) {
            helper.store.dispatch(
              requestPatchUserProfile(SETTINGS.user.username)
            )
          }

          wrapper.update()
          const next = wrapper.find("SpinnerButton")
          assert.equal(next.props().spinning, activity)
        })
      })
    }

    it("when unenroll program button click", () => {
      return renderComponent("/settings", userActions).then(([, div]) => {
        const unEnrollBtn = div.getElementsByClassName(
          "unenroll-wizard-button"
        )[0]
        assert.equal(unEnrollBtn.textContent, "Leave a MicroMasters Program")

        return listenForActions([SHOW_DIALOG], () => {
          unEnrollBtn.click()
        }).then(state => {
          assert.isTrue(state.ui.dialogVisibility[UNENROLL_PROGRAM_DIALOG])
        })
      })
    })
  })
})
