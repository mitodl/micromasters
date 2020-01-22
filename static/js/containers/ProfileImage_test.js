/* global SETTINGS: false */
import React from "react"
import ReactTestUtils from "react-dom/test-utils"
import { mount } from "enzyme"
import { assert } from "chai"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import { Provider } from "react-redux"

import ProfileImage, { PROFILE_IMAGE_DIALOG } from "./ProfileImage"
import IntegrationTestHelper from "../util/integration_test_helper"
import { showDialog } from "../actions/ui"
import * as api from "../lib/api"
import { startPhotoEdit, requestPatchUserPhoto } from "../actions/image_upload"

describe("ProfileImage", () => {
  let helper, sandbox, updateProfileImageStub, div

  const thatProfile = {
    username:       "rfeather",
    email:          "rf@example.com",
    first_name:     "Reginald",
    last_name:      "Feathersworth",
    preferred_name: "Reggie"
  }

  const renderProfileImage = (props = {}) => {
    div = document.createElement("div")
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <Provider store={helper.store}>
          <ProfileImage profile={thatProfile} {...props} />
        </Provider>
      </MuiThemeProvider>,
      {
        attachTo: div
      }
    )
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    sandbox = helper.sandbox
    // thatProfile is the logged in user
    SETTINGS.user.username = thatProfile.username
    updateProfileImageStub = sandbox.stub(api, "updateProfileImage")
    updateProfileImageStub
      .withArgs(thatProfile.username)
      .returns(Promise.resolve())
    helper.profileGetStub
      .withArgs(thatProfile.username)
      .returns(Promise.resolve(thatProfile))
  })

  afterEach(() => {
    helper.cleanup()
  })

  describe("upload button", () => {
    it("should be hidden if not editable", () => {
      const image = renderProfileImage({
        editable: false
      })

      assert.lengthOf(
        image.find(".open-photo-dialog"),
        0,
        "image should contain a button to upload a profile photo"
      )
    })

    it("should be visible if editable and is users own profile", () => {
      const image = renderProfileImage({
        editable: true
      })

      assert.lengthOf(
        image.find(".open-photo-dialog"),
        1,
        "image should contain a button to upload a profile photo"
      )
    })

    it("should be hidden if editable and another users profile", () => {
      SETTINGS.user.username = "other"
      const image = renderProfileImage({
        editable: true
      })

      assert.lengthOf(
        image.find(".open-photo-dialog"),
        0,
        "image should not contain a button to upload a profile photo"
      )
    })

    it("should display a 'open' link with the correct link text if passed the right props", () => {
      const image = renderProfileImage({
        editable: true,
        showLink: true,
        linkText: "some link text"
      })

      const link = image.find("a")
      assert.equal(link.text(), "some link text")
      link.simulate("click")
      assert.ok(
        helper.store.getState().ui.dialogVisibility[PROFILE_IMAGE_DIALOG],
        "should be open now"
      )
    })

    it("should have a ProfileImageUploader only for the logged in user", () => {
      for (const loggedIn of [true, false]) {
        SETTINGS.user.username = loggedIn ? thatProfile.username : "other_user"
        const image = renderProfileImage({
          editable: true
        })

        assert.equal(image.find("ProfileImageUploader").length === 1, loggedIn)
      }
    })

    describe("save button", () => {
      it("should show the save button when there's an image", () => {
        renderProfileImage({
          editable: true
        })
        helper.store.dispatch(startPhotoEdit({ name: "a name" }))
        helper.store.dispatch(showDialog(PROFILE_IMAGE_DIALOG))
        const dialog = document.querySelector(".photo-upload-dialog")
        const saveButton = dialog.querySelector(".save-button")
        assert.isFalse(saveButton.className.includes("disabled"))
        assert.isNull(dialog.querySelector(".MuiCircularProgress-root"))
        ReactTestUtils.Simulate.click(saveButton)
        assert.isTrue(updateProfileImageStub.called)
      })

      it("should disable the save button if no image is picked", () => {
        renderProfileImage({
          editable: true
        })
        helper.store.dispatch(showDialog(PROFILE_IMAGE_DIALOG))
        const dialog = document.querySelector(".photo-upload-dialog")
        const saveButton = dialog.querySelector(".save-button")
        assert.isTrue(saveButton.disabled)
        assert.isFalse(saveButton.innerHTML.includes("mdl-spinner"))
        ReactTestUtils.Simulate.click(saveButton)
        assert.isFalse(updateProfileImageStub.called)
        assert.isNull(dialog.querySelector(".MuiCircularProgress-root"))
      })

      it("should show a spinner while uploading the image", () => {
        renderProfileImage({
          editable: true
        })
        helper.store.dispatch(startPhotoEdit({ name: "a name" }))
        helper.store.dispatch(showDialog(PROFILE_IMAGE_DIALOG))
        helper.store.dispatch(requestPatchUserPhoto(SETTINGS.user.username))
        const dialog = document.querySelector(".photo-upload-dialog")
        assert.isNotNull(dialog.querySelector(".MuiCircularProgress-root"))
      })

      it("should disable the save button when uploading an image", () => {
        renderProfileImage({
          editable: true
        })
        helper.store.dispatch(startPhotoEdit({ name: "a name" }))
        helper.store.dispatch(showDialog(PROFILE_IMAGE_DIALOG))
        helper.store.dispatch(requestPatchUserPhoto(SETTINGS.user.username))
        const dialog = document.querySelector(".photo-upload-dialog")
        const saveButton = dialog.querySelector(".save-button")
        assert.isTrue(saveButton.disabled)
        assert.isFalse(
          saveButton.innerHTML.includes("MuiCircularProgress-root")
        )
        ReactTestUtils.Simulate.click(saveButton)
        assert.isFalse(updateProfileImageStub.called)
      })
    })
  })
})
