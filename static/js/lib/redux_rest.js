// @flow
import type { Endpoint } from "../flow/restTypes"
import { automaticEmailsEndpoint } from "../reducers/automatic_emails"
import { courseEnrollmentsEndpoint } from "../reducers/course_enrollments"
import { coursePricesEndpoint } from "../reducers/course_prices"
import { programLearnersEndpoint } from "../reducers/program_learners"
import { deriveReducers, deriveActions } from "redux-hammock"

export const endpoints: Array<Endpoint> = [
  automaticEmailsEndpoint,
  courseEnrollmentsEndpoint,
  coursePricesEndpoint,
  programLearnersEndpoint
]

const reducers: Object = {}
const actions: Object = {}
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint)
  reducers[endpoint.name] = deriveReducers(endpoint, actions[endpoint.name])
})

export { reducers, actions }
