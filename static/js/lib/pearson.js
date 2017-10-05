// @flow
/* global SETTINGS:false */
import R from "ramda"

export const staticFormEntries: Array<[string, string]> = []

const ssoFormEntries = (
  studentId,
  timestamp,
  timeout,
  ssoDigest,
  ssoRedirectURL
) => {
  const baseURL = ssoRedirectURL.replace(/\/$/, "")
  if (R.isNil(SETTINGS.EXAMS_SSO_CLIENT_CODE)) {
    throw new Error("EXAMS_SSO_CLIENT_CODE not configured")
  }
  return [
    ["ACTION", "scheduleExam"],
    ["CLIENT_CODE", SETTINGS.EXAMS_SSO_CLIENT_CODE],
    ["EXTERNAL_ERROR_URL", `${baseURL}/pearson/error`],
    ["EXTERNAL_LOGOUT_URL", `${baseURL}/pearson/logout`],
    ["EXTERNAL_RETURN_URL", `${baseURL}/pearson/success`],
    ["EXTERNAL_TIMEOUT_URL", `${baseURL}/pearson/timeout`],
    ["CLIENT_CANDIDATE_ID", String(studentId)],
    ["EXTERNAL_PAGE_TIMESTAMP", String(timestamp)],
    ["EXTERNAL_SESSION_TIMEOUT", String(timeout)],
    ["EXTERNAL_AUTH_HASH", ssoDigest]
  ]
}

export const createFormInput = R.curry((form, [name, value]) => {
  const node = document.createElement("input")
  node.type = "hidden"
  node.name = name
  node.value = value
  form.appendChild(node)
})

const createForm = () => {
  const form = document.createElement("form")
  // $FlowFixMe: flow disagrees
  document.body.appendChild(form)
  if (R.isNil(SETTINGS.EXAMS_SSO_URL)) {
    throw new Error("EXAMS_SSO_URL not configured")
  }
  form.action = SETTINGS.EXAMS_SSO_URL
  return form
}

export const generateSSOForm = (
  studentId: number,
  timestamp: number,
  timeout: number,
  ssoDigest: string,
  ssoRedirectURL: string
) => {
  const form = createForm()
  R.map(
    createFormInput(form),
    ssoFormEntries(studentId, timestamp, timeout, ssoDigest, ssoRedirectURL)
  )
  return form
}
