// @flow
/* global SETTINGS: false */
import { fetchJSONWithAuthToken } from "../lib/auth"

import { GET, INITIAL_STATE } from "redux-hammock/constants"

import { frontpageAPI } from "../lib/discussions"

import type { Endpoint } from "../flow/restTypes"

export const FRONTPAGE_INITIAL_STATE = {
  ...INITIAL_STATE,
  data: []
}

export const discussionsFrontpageEndpoint: Endpoint = {
  name:         "discussionsFrontpage",
  verbs:        [GET],
  initialState: FRONTPAGE_INITIAL_STATE,
  getFunc:      async () => {
    if (SETTINGS.open_discussions_base_url) {
      return await fetchJSONWithAuthToken(frontpageAPI())
    } else {
      return Promise.resolve([])
    }
  },
  getSuccessHandler: ({ posts }) => posts.concat()
}
