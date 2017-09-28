// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import _ from "lodash"
import sinon from "sinon"

import Grades from "./Grades"
import {
  makeCourse,
  makeProctoredExamResult
} from "../../../factories/dashboard"
import { STATUS_PASSED, STATUS_OFFERED } from "../../../constants"
import { EXAM_GRADE, EDX_GRADE } from "../../../containers/DashboardPage"

describe("Course Grades", () => {
  let course, setShowGradeDetailDialogStub

  beforeEach(() => {
    course = makeCourse(1)
    course.has_exam = true
    setShowGradeDetailDialogStub = sinon.stub()
  })

  const renderGrades = () =>
    shallow(
      <Grades
        course={course}
        setShowGradeDetailDialog={setShowGradeDetailDialogStub}
        dialogVisibility={{}}
      />
    )

  it("should display placeholders if no grades are present", () => {
    const grades = renderGrades()
    grades.find(".number").forEach(wrapper => {
      assert.equal(wrapper.text(), "--")
    })
  })

  it("should display the highest edX grade", () => {
    course.runs[0].final_grade = 23
    course.runs[1].final_grade = 82
    const grades = renderGrades()
    assert.equal(grades.find(".ed-x-grade .number").text(), "82%")
  })

  it("should display the highest exam grade", () => {
    course.proctorate_exams_grades = [1, 2, 3].map(makeProctoredExamResult)
    let highest = 0
    course.proctorate_exams_grades.forEach(grade => {
      highest =
        grade.percentage_grade > highest ? grade.percentage_grade : highest
    })
    const grades = renderGrades()
    assert.equal(
      grades.find(".exam-grade .number").text(),
      `${_.round(highest * 100)}%`
    )
  })

  it("should display a final grade", () => {
    course.overall_grade = "40"
    const grades = renderGrades()
    assert.equal(
      grades.find(".final-grade .number").text(),
      `${course.overall_grade}%`
    )
  })

  it("should only display the edX grade if has_exam == false", () => {
    [[true, 3], [false, 1]].forEach(([hasExam, expectedGradeCount]) => {
      course.has_exam = hasExam
      const grades = renderGrades()
      assert.equal(
        grades.find(".course-grades").find(".grade-display").length,
        expectedGradeCount
      )
    })
  })

  it("should display passed for an exam course, if the user passed exam+course", () => {
    course.runs[0].status = STATUS_PASSED
    course.proctorate_exams_grades = [makeProctoredExamResult()]
    course.proctorate_exams_grades[0].passed = true
    const passedDisplay = renderGrades().find(".passed-course")
    assert.equal(passedDisplay.length, 1)
    assert.include(passedDisplay.text(), "Passed")
  })

  it("should display passed for a non-exam course, if the user passed course", () => {
    course.runs[0].status = STATUS_PASSED
    course.has_exam = false
    const passedDisplay = renderGrades().find(".passed-course")
    assert.equal(passedDisplay.length, 1)
    assert.include(passedDisplay.text(), "Passed")
  })

  it("should not display passed if a user did not pass (exam course)", () => {
    [
      [STATUS_PASSED, false],
      [STATUS_OFFERED, false],
      [STATUS_OFFERED, true]
    ].forEach(([courseStatus, examPassed]) => {
      course.runs.forEach(run => {
        run.status = courseStatus
      })
      course.proctorate_exams_grades = [makeProctoredExamResult()]
      course.proctorate_exams_grades[0].passed = examPassed
      assert.equal(renderGrades().find(".passed-course").length, 0)
    })
  })

  it("should not display passed if a user did not pass (non-exam course)", () => {
    course.has_exam = false
    assert.equal(renderGrades().find(".passed-course").length, 0)
  })

  it("should call setShowGradeDetailDialog onClick", () => {
    const examGrade = makeProctoredExamResult()
    examGrade.passed = true
    course.proctorate_exams_grades.push(examGrade)
    const grades = renderGrades()
    grades
      .find(".open-popup")
      .first()
      .simulate("click")
    assert.ok(
      setShowGradeDetailDialogStub.calledWith(true, EDX_GRADE, course.title)
    )
    grades
      .find(".open-popup")
      .at(1)
      .simulate("click")
    assert.ok(
      setShowGradeDetailDialogStub.calledWith(true, EXAM_GRADE, course.title)
    )
  })
})
