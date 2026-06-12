// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import { getDashboard, getOwnDashboard } from "./util"
import { DASHBOARD_RESPONSE } from "../test_constants"
import { INITIAL_DASHBOARD_STATE } from "./dashboard"
import { assertIsJust, assertIsNothing } from "../lib/test_utils"

describe("reducer utilities", () => {
  describe("username selectors", () => {
    const state = {
      dashboard: {
        [SETTINGS.user.username]: DASHBOARD_RESPONSE
      }
    }

    describe("getOwnDashboard", () => {
      it("should return dashboard -> username, if present", () => {
        assert.deepEqual(getOwnDashboard(state), DASHBOARD_RESPONSE)
      })

      it("should return INITIAL_DASHBOARD_STATE otherwise", () => {
        assert.deepEqual(getOwnDashboard({}), INITIAL_DASHBOARD_STATE)
      })

      it("should not freak out if SETTINGS.user === null", () => {
        // $FlowFixMe: SETTINGS.user = null
        SETTINGS.user = null
        assert.deepEqual(getOwnDashboard({}), INITIAL_DASHBOARD_STATE)
      })
    })

    describe("getDashboard", () => {
      it("should return Just(the dashboard for a particular user), if present", () => {
        assertIsJust(
          getDashboard(SETTINGS.user.username, state.dashboard),
          DASHBOARD_RESPONSE
        )
      })

      it("should return Just(INITIAL_DASHBOARD_STATE) if not present", () => {
        assertIsJust(
          getDashboard("not_present_username", state.dashboard),
          INITIAL_DASHBOARD_STATE
        )
      })

      it("should return Nothing if either argument is nil", () => {
        [null, undefined].forEach(nilval => {
          assertIsNothing(getDashboard("potato", nilval))
          assertIsNothing(getDashboard(nilval, state.dashboard))
        })
      })
    })
  })
})
