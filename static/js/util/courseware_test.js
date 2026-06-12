// @flow
import { assert } from "chai"

import { coursewareBaseUrl, courseRunUrl } from "./courseware"
import { makeRun } from "../factories/dashboard"
import {
  EDX_LINK_BASE,
  MITXONLINE_LINK_BASE,
  COURSEWARE_BACKEND_EDXORG,
  COURSEWARE_BACKEND_MITXONLINE
} from "../constants"

describe("courseware utility functions", () => {
  describe("coursewareBaseUrl", () => {
    it("should return the edxurl for edx courseware", () => {
      assert.equal(coursewareBaseUrl(COURSEWARE_BACKEND_EDXORG), EDX_LINK_BASE)
    })

    it("should return the edxurl for mitxonline coursewaree", () => {
      assert.equal(
        coursewareBaseUrl(COURSEWARE_BACKEND_MITXONLINE),
        MITXONLINE_LINK_BASE
      )
    })
  })

  describe("courseRunUrl", () => {
    it("should return a course run url", () => {
      const courseRun = makeRun(0)
      assert.equal(
        courseRunUrl(courseRun),
        `/edx/courses/${courseRun.course_id}`
      )
    })
  })
})
