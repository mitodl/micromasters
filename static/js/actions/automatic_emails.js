// @flow
import { createAction } from "redux-actions"

export const TOGGLE_EMAIL_PATCH_IN_FLIGHT = "TOGGLE_EMAIL_PATCH_IN_FLIGHT"
export const toggleEmailPatchInFlight = createAction(
  TOGGLE_EMAIL_PATCH_IN_FLIGHT
)
