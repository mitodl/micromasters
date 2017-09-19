// @flow
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import type { Endpoint } from "../flow/restTypes"
import { GET } from "../constants"
import { INITIAL_STATE } from "../lib/redux_rest_constants"
import { getCoursePrices } from "../lib/api"

export const INITIAL_COURSE_PRICES_STATE = {
  ...INITIAL_STATE,
  data: []
}

export const coursePricesEndpoint: Endpoint = {
  name:                 "prices",
  namespaceOnUsername:  true,
  checkNoSpinner:       true,
  verbs:                [GET],
  getFunc:              getCoursePrices,
  initialState:         {},
  usernameInitialState: INITIAL_COURSE_PRICES_STATE,
  fetchFunc:            fetchJSONWithCSRF
}
