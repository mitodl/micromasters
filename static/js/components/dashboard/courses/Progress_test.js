// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import { courseRunUrl } from "../../../util/courseware"
import Progress from "./Progress"
import { findAndCloneCourse } from "../../../util/test_utils"

describe("Course Progress", () => {
  const course = findAndCloneCourse(
    course => course !== null && course !== undefined && course.runs.length > 0
  )
  course.runs[0].current_grade = 92

  const renderCourseProgress = () =>
    shallow(<Progress courseRun={course.runs[0]} className="classname" />)

  it("should the current progress for a course", () => {
    const progress = renderCourseProgress()
    assert.equal(progress.find(".number").text(), "92%")
    const progressUrl = `${courseRunUrl(course.runs[0])}/progress`
    assert.equal(progress.find("a").props().href, progressUrl)
    assert.equal(progress.find("a").props().target, "_blank")
  })

  it("shows a progress bar", () => {
    const progress = renderCourseProgress()
    assert.equal(progress.find(".course-progress").length, 1)
    assert.deepEqual(progress.find(".course-progress-bar").props().style, {
      width: "92%"
    })
  })
})
