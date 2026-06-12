// @flow
import R from "ramda"
import { fetchJSONWithCSRF } from "redux-hammock/django_csrf_fetch"

import { GET, PATCH } from "../constants"
import type { Endpoint } from "../flow/restTypes"
import type { Action } from "../flow/reduxTypes"
import { INITIAL_STATE } from "../lib/redux_rest_constants"
import { TOGGLE_EMAIL_PATCH_IN_FLIGHT } from "../actions/automatic_emails"

export const automaticEmailsEndpoint: Endpoint = {
  name:                "automaticEmails",
  namespaceOnUsername: false,
  checkNoSpinner:      false,
  verbs:               [GET, PATCH],
  getUrl:              "/api/v0/mail/automatic_email/",
  patchUrl:            email => `/api/v0/mail/automatic_email/${email.id}/`,
  fetchFunc:           fetchJSONWithCSRF,
  patchOptions:        emailRecord => ({
    method: PATCH,
    body:   JSON.stringify(emailRecord)
  }),
  patchSuccessHandler: (payload, oldData) =>
    R.update(
      R.findIndex(R.propEq("id", payload.id), oldData),
      payload,
      oldData
    ),
  initialState: { ...INITIAL_STATE, emailsInFlight: new Set() },
  extraActions: {
    [TOGGLE_EMAIL_PATCH_IN_FLIGHT]: (
      state: Object,
      action: Action<number, void>
    ) => {
      const emails = new Set(state.emailsInFlight)
      const { payload: id } = action
      return {
        ...state,
        emailsInFlight: emails.delete(id) ? emails : emails.add(id)
      }
    }
  }
}
