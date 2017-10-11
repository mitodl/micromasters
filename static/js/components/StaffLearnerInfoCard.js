// @flow
import React from "react"
import { Card, CardTitle } from "react-mdl/lib/Card"
import R from "ramda"

import { circularProgressWidget } from "./ProgressWidget"
import { programCourseInfo, classify } from "../util/util"
import type { Program } from "../flow/programTypes"
import { S, getm } from "../lib/sanctuary"
import type { DialogVisibilityState } from "../reducers/ui"

type StaffLearnerCardProps = {
  program: Program,
  setShowGradeDetailDialog: (b: boolean, t: string) => void,
  dialogVisibility: DialogVisibilityState
}

const programInfoBadge = (title, text) => (
  <div className={`program-info-badge ${classify(title)}`}>
    <div className="program-badge">{text}</div>
    <div className="title">{title}</div>
  </div>
)

// getProgramProp :: String -> Program -> Either String Number
const getProgramProp = R.curry((prop, program) =>
  S.maybeToEither("--", getm(prop, program))
)

// formatCourseGrade :: Program -> String
const formatCourseGrade = R.compose(
  R.prop("value"),
  S.map(grade => `${grade}%`),
  getProgramProp("grade_average")
)

const StaffLearnerInfoCard = (props: StaffLearnerCardProps) => {
  const { program } = props
  const { totalPassedCourses, totalCourses } = programCourseInfo(program)

  return (
    <Card shadow={1} className="staff-learner-info-card course-list">
      <CardTitle>{`Progress - ${program.title}`}</CardTitle>
      <div className="program-info">
        <div className="row">
          <div className="progress-widget">
            {circularProgressWidget(63, 7, totalPassedCourses, totalCourses)}
          </div>
          {programInfoBadge(
            "Average program grade",
            formatCourseGrade(program)
          )}
        </div>
      </div>
    </Card>
  )
}

export default StaffLearnerInfoCard
