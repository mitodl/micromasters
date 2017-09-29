// @flow
import { assert } from "chai"

import { makeCourse, makeProctoredExamResult } from "../factories/dashboard"
import {
  getLargestExamGrade,
  getLargestEdXGrade,
  hasPassingExamGrade,
  hasFailingExamGrade,
  hasPassedCourseRun,
  passedCourse
} from "./grades"
import {
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_PENDING_ENROLLMENT,
  STATUS_MISSED_DEADLINE,
  STATUS_PAID_BUT_NOT_ENROLLED
} from "../constants"

import { assertIsNothing, assertIsJust } from "./test_utils"

describe("Grades library", () => {
  let course

  beforeEach(() => {
    course = makeCourse(1)
  })

  describe("getLargestExamGrade", () => {
    it("returns Nothing if no exam grade", () => {
      assertIsNothing(getLargestExamGrade(course))
    })

    it("returns Just the largest grade, if present", () => {
      course.proctorate_exams_grades = [1, 2].map(makeProctoredExamResult)
      course.proctorate_exams_grades[0].percentage_grade = 0.12
      course.proctorate_exams_grades[1].percentage_grade = 0.89
      assertIsJust(getLargestExamGrade(course), 89)
    })
  })

  describe("getLargestEdXGrade", () => {
    it("returns Nothing if no edx grade", () => {
      assertIsNothing(getLargestEdXGrade(course))
    })

    it("returns Just the largest edx grade, if present", () => {
      course.runs[0].final_grade = 39
      course.runs[1].final_grade = 92
      assertIsJust(getLargestEdXGrade(course), 92)
    })
  })

  describe("hasPassingExamGrade", () => {
    let course

    beforeEach(() => {
      course = {
        proctorate_exams_grades: [1, 2].map(makeProctoredExamResult)
      }
    })
    it("should return true if the user has any passed exam grades", () => {
      course.proctorate_exams_grades[0].passed = true
      assert.isTrue(hasPassingExamGrade(course))
    })

    it("should return false otherwise", () => {
      course.proctorate_exams_grades.forEach(grade => {
        grade.passed = false
      })
      assert.isFalse(hasPassingExamGrade(course))
    })
  })

  describe("hasFailingExamGrade", () => {
    let course

    beforeEach(() => {
      course = {
        proctorate_exams_grades: [1, 2].map(makeProctoredExamResult)
      }
    })
    it("should return true if the user has any failing exam grades", () => {
      course.proctorate_exams_grades[0].passed = false
      assert.isTrue(hasFailingExamGrade(course))
    })

    it("should return false otherwise", () => {
      course.proctorate_exams_grades.forEach(grade => {
        grade.passed = true
      })
      assert.isFalse(hasFailingExamGrade(course))
    })
    it("should return false if no grades", () => {
      course.proctorate_exams_grades = []
      assert.isFalse(hasFailingExamGrade(course))
    })
  })

  describe("hasPassedCourseRun", () => {
    let course

    beforeEach(() => {
      course = makeCourse(0)
    })

    it("should return true if any course run has status === STATUS_PASSED", () => {
      course.runs[0].status = STATUS_PASSED
      assert.isTrue(hasPassedCourseRun(course))
    })

    it("should return false otherwise", () => {
      [
        STATUS_NOT_PASSED,
        STATUS_OFFERED,
        STATUS_CAN_UPGRADE,
        STATUS_CURRENTLY_ENROLLED,
        STATUS_WILL_ATTEND,
        STATUS_PENDING_ENROLLMENT,
        STATUS_MISSED_DEADLINE,
        STATUS_PAID_BUT_NOT_ENROLLED
      ].forEach(status => {
        course.runs.forEach(run => {
          run.status = status
        })
        assert.isFalse(hasPassedCourseRun(course))
      })
    })
  })

  describe("passedCourse", () => {
    let course

    beforeEach(() => {
      course = makeCourse(0)
    })

    describe("exam course", () => {
      it("should return true if the course and exam are passed", () => {
        course.runs[0].status = STATUS_PASSED
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = true
        course.has_exam = true
        assert.isTrue(passedCourse(course))
      })

      it("should return false if you only pass the course", () => {
        course.runs[0].status = STATUS_PASSED
        course.has_exam = true
        assert.isFalse(passedCourse(course))
      })

      it("should return false if you only pass the exam (not possible really)", () => {
        course.has_exam = true
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = true
        assert.isFalse(passedCourse(course))
      })

      it("should return false otherwise", () => {
        course.has_exam = true
        assert.isFalse(passedCourse(course))
      })
    })

    describe("non-exam course", () => {
      it("should return true if the course was passed", () => {
        course.runs[0].status = STATUS_PASSED
        assert.isTrue(passedCourse(course))
      })

      it("should return false otherwise", () => {
        assert.isFalse(passedCourse(course))
      })
    })
  })
})
