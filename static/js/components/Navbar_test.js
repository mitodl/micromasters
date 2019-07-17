/* global SETTINGS: false */
import { assert } from "chai"
import { shallow } from "enzyme"
import React from "react"
import Link from "react-router/lib/Link"

import Navbar from "./Navbar"
import {
  USER_PROFILE_RESPONSE,
  DASHBOARD_RESPONSE,
  PROGRAMS
} from "../test_constants"

describe("Navbar", () => {
  const props = {
    profile:   USER_PROFILE_RESPONSE,
    dashboard: { programs: DASHBOARD_RESPONSE },
    programs:  PROGRAMS
  }

  const renderNavbar = () => shallow(<Navbar {...props} />)

  it("has a link to the dashboard if the user has no roles", () => {
    const wrapper = renderNavbar()
    const hrefs = wrapper.find(Link).map((link) => link.props()["to"])
    assert.deepEqual(hrefs, [
      "/learner/jane",
      "/learner/jane",
      "/dashboard",
      "/learner/jane",
      "/settings",
      "/dashboard",
      "/dashboard"
    ])
  })

  it("has a link to the learner page and the email page if the user is staff or instructor", () => {
    for (const role of ["staff", "instructor"]) {
      SETTINGS.roles = [{ role, permissions: [] }]
      const wrapper = renderNavbar()
      const hrefs = wrapper.find(Link).map((link) => link.props()["to"])
      assert.deepEqual(hrefs, [
        "/learner/jane",
        "/learner/jane",
        "/learners",
        "/automaticemails",
        "/learner/jane",
        "/settings",
        "/learners",
        "/learners"
      ])
    }
  })

  it("should show a link to the financial aid review page, if the user has that permission", () => {
    SETTINGS.roles = [
      {
        role:        "staff",
        permissions: ["can_edit_financial_aid"],
        program:     1
      }
    ]
    const wrapper = renderNavbar()
    assert.equal(
      wrapper.find("a[href='/financial_aid/review/1']").text(),
      "Personal Price Admin"
    )
  })

  it("has a logout link", () => {
    const wrapper = renderNavbar()
    assert.equal(wrapper.find("a[href='/logout']").text(), "Logout")
  })

  it("should display menu icon when user is logged in", () => {
    SETTINGS.user = { username: "tester" }
    const wrapper = renderNavbar()
    assert.isTrue(
      wrapper.find(".menu-icon").exists(),
      "menu icon should be displayed"
    )
  })

  it("should not display menu icon when user is logged out", () => {
    SETTINGS.user = undefined
    const wrapper = renderNavbar()
    assert.isFalse(
      wrapper.find(".menu-icon").exists(),
      "menu icon should not be displayed"
    )
  })
})
