// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import Link from "react-router/lib/Link"
import Typography from "@material-ui/core/Typography"

import ProfileImage from "../../containers/ProfileImage"
import { DASHBOARD_RESPONSE, USER_PROFILE_RESPONSE } from "../../test_constants"
import DashboardUserCard from "./DashboardUserCard"

describe("DashboardUserCard", () => {
  it("renders a user card", () => {
    const program = DASHBOARD_RESPONSE.programs[1]
    const profile = USER_PROFILE_RESPONSE
    const wrapper = shallow(
      <DashboardUserCard profile={profile} program={program} />
    )
    assert.equal(
      wrapper
        .find(".dashboard-user-card-image")
        .find(ProfileImage)
        .props().profile,
      profile
    )
    const textContainer = wrapper.find(".dashboard-user-card-text")
    assert.equal(
      textContainer
        .find(Typography)
        .first()
        .text(),
      "Jane"
    )

    assert.equal(
      textContainer.find(".dashboard-user-card-text-program").text(),
      program.title
    )
    const link = textContainer.find(Link)
    assert.deepEqual(link.children().text(), "View Profile")
    assert.deepEqual(link.props().to, `/learner/${profile.username}`)
  })

  it("shows no title if no program is present", () => {
    const wrapper = shallow(
      <DashboardUserCard profile={USER_PROFILE_RESPONSE} program={undefined} />
    )
    assert.equal(wrapper.find(".dashboard-user-card-text-program").text(), "")
  })
})
