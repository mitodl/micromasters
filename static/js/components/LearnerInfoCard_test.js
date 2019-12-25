// @flow
/* global SETTINGS */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import LearnerInfoCard from "./LearnerInfoCard"
import { USER_PROFILE_RESPONSE } from "../test_constants"
import { mstr } from "../lib/sanctuary"
import { getEmployer, getPreferredName } from "../util/util"

describe("LearnerInfoCard", () => {
  let sandbox, editProfileBtnStub, editAboutMeBtnStub

  const renderInfoCard = (props = {}) =>
    shallow(
      <LearnerInfoCard
        profile={USER_PROFILE_RESPONSE}
        toggleShowPersonalDialog={editProfileBtnStub}
        toggleShowAboutMeDialog={editAboutMeBtnStub}
        openLearnerEmailComposer={() => {}}
        {...props}
      />
    )

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    editProfileBtnStub = sandbox.stub()
    editAboutMeBtnStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("render user info card", () => {
    const wrapper = renderInfoCard()
    assert.equal(
      wrapper.find(".profile-title").text(),
      getPreferredName(USER_PROFILE_RESPONSE)
    )
    assert.equal(
      wrapper.find(".profile-company-name").text(),
      mstr(getEmployer(USER_PROFILE_RESPONSE))
    )
    assert.equal(wrapper.find("h3").text(), "About Me")
    assert.equal(
      wrapper.find(".bio.placeholder").text(),
      "Write something about yourself, so others can learn a bit about you."
    )
  })

  it("edit profile works", () => {
    const wrapper = renderInfoCard()
    const editProfileButton = wrapper.find(".edit-profile-holder").childAt(0)
    editProfileButton.simulate("click")
    assert.equal(editProfileBtnStub.callCount, 1)
  })

  it("edit about me works", () => {
    const wrapper = renderInfoCard()
    const editAboutMeButton = wrapper.find(".edit-about-me-holder").childAt(0)
    editAboutMeButton.simulate("click")
    assert.equal(editAboutMeBtnStub.callCount, 1)
  })

  it('should not allow the user to edit "about me" when viewing a different profile', () => {
    const wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        username: "xyz"
      }
    })
    assert.equal(wrapper.find(".edit-about-me-holder").children().length, 0)
  })

  it('shows an "about me" section', () => {
    const wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        about_me: "Hello world"
      }
    })
    assert.equal(wrapper.find("h3").text(), "About Me")
    assert.equal(wrapper.find(".bio").text(), "Hello world")
  })

  it('correctly shows a multiline "about me" section', () => {
    const wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        about_me: "Hello \n world"
      }
    })
    assert.equal(
      wrapper.find(".bio").html(),
      '<div class="bio">Hello \n world</div>'
    )
  })

  it("should not show legal name if the user is not staff", () => {
    const wrapper = renderInfoCard()
    assert.equal(wrapper.find(".legal-name").length, 0)
  })

  it("should show legal name if the user is staff", () => {
    SETTINGS.user.username = "My user"
    SETTINGS.roles = [
      {
        role:    "staff",
        program: 1
      }
    ]
    const wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        first_name: "FIRST",
        last_name:  "LAST"
      }
    })
    assert.equal(wrapper.find(".legal-name").text(), "(Legal name: FIRST LAST)")
  })

  it("should not show student id if the user is not staff", () => {
    const wrapper = renderInfoCard()
    assert.equal(wrapper.find(".student-id").length, 0)
  })

  it("should show student id if the user is staff", () => {
    SETTINGS.user.username = "My user"
    SETTINGS.roles = [
      {
        role:    "staff",
        program: 1
      }
    ]
    const wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        student_id: 123
      }
    })
    assert.equal(wrapper.find(".student-id").text(), "(Student Id: 123)")
  })

  describe("email link", () => {
    const originalUsername = SETTINGS.user.username

    beforeEach(() => {
      SETTINGS.user.username = "My user"
      SETTINGS.roles = [
        {
          role:    "staff",
          program: 1
        }
      ]
    })

    it("should be shown if a staff user is viewing a different profile", () => {
      const card = renderInfoCard({
        profile: {
          ...USER_PROFILE_RESPONSE,
          email:       "learner@example.com",
          email_optin: true
        }
      })
      assert.include(card.find(".icon-button-link").text(), "Send a Message")
    })

    it("should not be shown if the user is not opted in to email", () => {
      const card = renderInfoCard({
        profile: {
          ...USER_PROFILE_RESPONSE,
          email:       "learner@example.com",
          email_optin: false
        }
      })
      assert.lengthOf(card.find(".icon-button-link"), 0)
    })

    it("should not be shown if the user has no email address", () => {
      const card = renderInfoCard({
        profile: {
          ...USER_PROFILE_RESPONSE,
          email:       null,
          email_optin: true
        }
      })
      assert.lengthOf(card.find(".icon-button-link"), 0)
    })

    it("should not be shown if the user is viewing their own profile page", () => {
      SETTINGS.user.username = originalUsername
      const card = renderInfoCard({
        profile: {
          ...USER_PROFILE_RESPONSE,
          email:       "learner@example.com",
          email_optin: true
        }
      })
      assert.lengthOf(card.find(".icon-button-link"), 0)
    })

    it("should not be shown if the logged-in user is not staff", () => {
      SETTINGS.roles = []
      const card = renderInfoCard({
        profile: {
          ...USER_PROFILE_RESPONSE,
          email:       "learner@example.com",
          email_optin: true
        }
      })
      assert.lengthOf(card.find(".icon-button-link"), 0)
    })
  })
})
