// @flow
import { createAction } from "redux-actions"
import R from "ramda"

import type { ActionType } from "../flow/reduxTypes"

// returns an action creator that takes (username, payload) as it's arguments
// the 'meta' field on the returned action holds the username
//
// type alias Type :: String
// type alias Username :: String
// type class Payload a
// type UsernameAction a = { type :: Type, meta :: Username, payload :: Payload a }
// withUsername :: Payload a => Type -> (Username -> a -> UsernameAction a)
export const withUsername = (
  type: ActionType,
  payloadFunc: Function = R.nthArg(1)
) => createAction(type, payloadFunc, R.identity)
