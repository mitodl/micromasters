// @flow
/* global SETTINGS: false */
import R from "ramda"
import _ from "lodash"
import { INITIAL_DASHBOARD_STATE } from "./dashboard"
import { INITIAL_COURSE_PRICES_STATE } from "./course_prices"
import { guard } from "../lib/sanctuary"
import type { DashboardsState, CoursePricesState } from "../flow/dashboardTypes"

export const getInfoByUsername = R.curry(
  (reducer, defaultTo, username, state) =>
    R.pathOr(defaultTo, [reducer, username], state)
)

const usernameIfPresent = () => (SETTINGS.user ? SETTINGS.user.username : "")

export const getOwnDashboard = (state: { dashboard?: DashboardsState }) =>
  getInfoByUsername(
    "dashboard",
    INITIAL_DASHBOARD_STATE,
    usernameIfPresent(),
    state
  )

export const getOwnCoursePrices = (state: { prices?: CoursePricesState }) =>
  getInfoByUsername(
    "prices",
    INITIAL_COURSE_PRICES_STATE,
    usernameIfPresent(),
    state
  )

export const getDashboard = guard((username, dashboard) =>
  R.pathOr(INITIAL_DASHBOARD_STATE, [username], dashboard)
)

export const getCoursePrices = guard((username, prices?: CoursePricesState) =>
  R.pathOr(INITIAL_COURSE_PRICES_STATE, [username], prices)
)

export const updateStateByUsername = (
  state: Object,
  username: string,
  update: Object
) => _.merge({}, state, { [username]: update })
