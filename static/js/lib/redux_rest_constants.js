// @flow
import type { RestState } from "../flow/restTypes"

export const INITIAL_STATE: RestState<*> = {
  loaded:     false,
  processing: false
}
