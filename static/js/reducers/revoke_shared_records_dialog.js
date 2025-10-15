// @flow
import { SET_REVOKE_DIALOG_VISIBILITY } from "../actions/revoke_shared_records_dialog"
import type { Action } from "../flow/reduxTypes"

export type RevokeShareDialogState = {
  revokeShareDialogVisibility: boolean
}

export const INITIAL_REVOKE_SHARE_STATE = {
  revokeShareDialogVisibility: false
}

export const revokeShareDialog = (
  state: RevokeShareDialogState = INITIAL_REVOKE_SHARE_STATE,
  action: Action<RevokeShareDialogState>
) => {
  switch (action.type) {
  case SET_REVOKE_DIALOG_VISIBILITY:
    return { ...state, revokeShareDialogVisibility: action.payload }
  default:
    return state
  }
}
