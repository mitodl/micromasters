// @flow
import type { Endpoint } from "../flow/restTypes"
import { GET } from "../constants"
import { INITIAL_STATE } from "../lib/redux_rest_constants"
import { getProgramLearners } from "../lib/api"

export const INITIAL_PROGRAM_LEARNERS_STATE = {
  ...INITIAL_STATE,
  data: []
}

export const programLearnersEndpoint: Endpoint = {
  name:                 "programLearners",
  namespaceOnUsername:  true,
  checkNoSpinner:       true,
  verbs:                [GET],
  getFunc:              getProgramLearners,
  initialState:         {},
  usernameInitialState: INITIAL_PROGRAM_LEARNERS_STATE
}
