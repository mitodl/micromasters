// @flow
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import { POST } from "../constants"
import { INITIAL_STATE } from "../lib/redux_rest_constants"

import type { Endpoint } from "../flow/restTypes"

export const channelsEndpoint: Endpoint = {
  name:                "channels",
  namespaceOnUsername: false,
  checkNoSpinner:      false,
  verbs:               [POST],
  postUrl:             "/api/v0/channels/",
  fetchFunc:           fetchJSONWithCSRF,
  postOptions:         (channel) => ({
    method: POST,
    body:   JSON.stringify(channel)
  }),
  initialState: { ...INITIAL_STATE }
}
