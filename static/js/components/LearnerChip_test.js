import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import { USER_PROFILE_RESPONSE } from "../test_constants"
import R from "ramda"
import LearnerChip from "./LearnerChip"
import { getPreferredName } from "../util/util"
import ProfileImage from "../containers/ProfileImage"

describe("LearnerChip", () => {
  let profileClone, sandbox

  const renderChip = (profile, openLearnerEmailComposer) =>
    shallow(
      <LearnerChip
        profile={profile}
        openLearnerEmailComposer={openLearnerEmailComposer}
      />
    )

  beforeEach(() => {
    profileClone = R.clone(USER_PROFILE_RESPONSE)
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should show the preferred name", () => {
    let chip = renderChip(profileClone)
    assert.equal(chip.find(".name").text(), getPreferredName(profileClone))
  })

  it("should show the employer, if present", () => {
    let chip = renderChip(profileClone)
    assert.equal(chip.find(".employer").text(), "Planet Express")
  })

  it("should leave employer blank, if absent", () => {
    profileClone.work_history = []
    let chip = renderChip(profileClone)
    assert.equal(chip.find(".employer").text(), "")
  })

  it("should link to the profile", () => {
    let chip = renderChip(profileClone)
    let url = chip.find("a").props().href
    assert.equal(url, `/learner/${profileClone.username}`)
  })

  it("should provide a link to email the learner", () => {
    let openLearnerEmailComposer = sandbox.stub()
    profileClone.email_optin = true
    let chip = renderChip(profileClone, openLearnerEmailComposer)
    let emailLink = chip.find("button").at(0)
    emailLink.simulate("click")
    sinon.assert.calledOnce(openLearnerEmailComposer)
  })

  it("should hide the email link when the learner is opted out of email", () => {
    let openLearnerEmailComposer = sandbox.stub()
    profileClone.email_optin = false
    let chip = renderChip(profileClone, openLearnerEmailComposer)
    assert.lengthOf(chip.find("button"), 0)
  })

  it("should include the profile image", () => {
    let chip = renderChip(profileClone)
    assert(
      chip.containsMatchingElement(<ProfileImage />),
      "chip should contain a ProfileImage component"
    )
  })
})
