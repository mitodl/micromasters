// @flow
import { deriveReducers, deriveActions } from "redux-hammock"

import { automaticEmailsEndpoint } from "../reducers/automatic_emails"
import { courseEnrollmentsEndpoint } from "../reducers/course_enrollments"
import { programLearnersEndpoint } from "../reducers/program_learners"
import { examEnrollmentEndpoint } from "../reducers/exam_enrollment"

import type { Endpoint } from "../flow/restTypes"

export const endpoints: Array<Endpoint> = [
  automaticEmailsEndpoint,
  courseEnrollmentsEndpoint,
  examEnrollmentEndpoint,
  programLearnersEndpoint
]

const reducers: Object = {}
const actions: Object = {}
endpoints.forEach(endpoint => {
  actions[endpoint.name] = deriveActions(endpoint)
  reducers[endpoint.name] = deriveReducers(endpoint, actions[endpoint.name])
})

export { reducers, actions }
