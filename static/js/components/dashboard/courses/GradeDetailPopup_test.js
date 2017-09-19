// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import Icon from "react-mdl/lib/Icon"
import Dialog from "material-ui/Dialog"

import GradeDetailPopup from "./GradeDetailPopup"
import {
  makeCourse,
  makeProctoredExamResult
} from "../../../factories/dashboard"
import { makeRunPassed, makeRunFailed } from "./test_util"
import { EXAM_GRADE, EDX_GRADE } from "../../../containers/DashboardPage"
import { formatGrade } from "../util"

describe("GradeDetailPopup", () => {
  let sandbox, course, setShowGradeDetailDialogStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    course = makeCourse(0)
    course.proctorate_exams_grades = [makeProctoredExamResult()]
    setShowGradeDetailDialogStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  let renderDetailPopup = (props = {}) =>
    shallow(
      <GradeDetailPopup
        course={course}
        gradeType={EDX_GRADE}
        setShowGradeDetailDialog={setShowGradeDetailDialogStub}
        dialogVisibility={false}
        {...props}
      />
    )

  it("shows info for an audited course", () => {
    renderDetailPopup()
      .find(".course-run-row")
      .forEach((node, idx) =>
        assert.equal(node.text(), `${course.runs[idx].title}Audited`)
      )
  })

  it("shows info for a passed course", () => {
    makeRunPassed(course.runs[0])
    let wrapper = renderDetailPopup()
    assert.equal(
      wrapper
        .find(".course-run-row")
        .first()
        .text(),
      `${course.runs[0].title}Passed`
    )
  })

  it("shows a grade, if there is one", () => {
    course.runs[0].final_grade = 93
    assert.include(
      renderDetailPopup()
        .find(".course-run-row")
        .first()
        .text(),
      "93"
    )
  })

  it("shows info for a failed course", () => {
    makeRunFailed(course.runs[1])
    assert.equal(
      renderDetailPopup()
        .find(".course-run-row")
        .at(1)
        .text(),
      `${course.runs[1].title}Not passed`
    )
  })

  it("highlights the best edx grade", () => {
    course.runs[0].final_grade = 22
    course.runs[1].final_grade = 82
    let wrapper = renderDetailPopup()
    assert.equal(
      wrapper
        .find(".course-run-row")
        .at(0)
        .find(Icon).length,
      0
    )
    assert.equal(
      wrapper
        .find(".course-run-row")
        .at(1)
        .find(Icon).length,
      1
    )
  })

  it("includes helpful information", () => {
    let wrapper = renderDetailPopup()
    assert.equal(
      wrapper.find(".explanation").text(),
      "Only your best passing grade counts toward your final grade"
    )
  })

  it("should show an appropriate title for the edx grades", () => {
    let wrapper = renderDetailPopup({ gradeType: EDX_GRADE })
    let title = wrapper.find(Dialog).props().title
    assert.include(title, "Completed edX Course Runs")
  })

  it("should show an appropriate title for the exam grades", () => {
    let wrapper = renderDetailPopup({ gradeType: EXAM_GRADE })
    let title = wrapper.find(Dialog).props().title
    assert.include(title, "Completed Exams")
  })

  it("should display exam grades, if passed the right grade type", () => {
    let wrapper = renderDetailPopup({ gradeType: EXAM_GRADE })
    assert.include(
      wrapper
        .find(".course-run-row")
        .first()
        .text(),
      formatGrade(course.proctorate_exams_grades[0].percentage_grade * 100)
    )
  })

  it("should show a zero grade", () => {
    course.proctorate_exams_grades[0].percentage_grade = 0
    let wrapper = renderDetailPopup({ gradeType: EXAM_GRADE })
    assert.include(
      wrapper
        .find(".course-run-row")
        .first()
        .text(),
      formatGrade(course.proctorate_exams_grades[0].percentage_grade * 100)
    )
  })

  it("should highlight the best exam grade", () => {
    course.proctorate_exams_grades.push(makeProctoredExamResult())
    course.proctorate_exams_grades[0].percentage_grade = 0.2
    course.proctorate_exams_grades[1].percentage_grade = 0.8
    course.proctorate_exams_grades[1].passed = true
    let wrapper = renderDetailPopup({ gradeType: EXAM_GRADE })
    assert.equal(
      wrapper
        .find(".course-run-row")
        .at(0)
        .find(Icon).length,
      0
    )
    assert.equal(
      wrapper
        .find(".course-run-row")
        .at(1)
        .find(Icon).length,
      1
    )
  })
})
