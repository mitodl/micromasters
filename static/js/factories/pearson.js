// @flow
import type { PearsonSSOParameters } from "../flow/pearsonTypes"

export const makeSSOParameters = (): PearsonSSOParameters => {
  const timestamp = Math.round(new Date().getTime() / 1000)
  return {
    sso_digest:
      "63a428fade2a0366230044a31bcd5c7592e30f030ede3b38b299278d526d09c1",
    timestamp:       timestamp,
    session_timeout: timestamp + 5000
  }
}
