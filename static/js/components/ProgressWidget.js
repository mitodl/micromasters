// @flow
import React from "react"
import { Card, CardTitle } from "react-mdl/lib/Card"
import Button from "react-mdl/lib/Button"

import type { Program } from "../flow/programTypes"
import { programCourseInfo } from "../util/util"

export const circularProgressWidget = (
  radius: number,
  strokeWidth: number,
  totalPassedCourses: number,
  totalCourses: number
): React$Element<*> => {
  const radiusForMeasures = radius - strokeWidth / 2
  const width = radius * 2
  const height = radius * 2
  const viewBox = `0 0 ${width} ${height}`
  const dashArray = radiusForMeasures * Math.PI * 2
  const dashOffset =
    dashArray - dashArray * totalPassedCourses / (totalCourses || 1)

  return (
    <div className="circular-progress-widget">
      <svg
        className="circular-progress-widget"
        width={radius * 2}
        height={radius * 2}
        viewBox={viewBox}
      >
        <circle
          className="circular-progress-widget-bg"
          cx={radius}
          cy={radius}
          r={radiusForMeasures}
          strokeWidth={`${strokeWidth}px`}
        />
        <circle
          className="circular-progress-widget-fg"
          cx={radius}
          cy={radius}
          r={radiusForMeasures}
          strokeWidth={`${strokeWidth}px`}
          style={{
            strokeDasharray:  dashArray,
            strokeDashoffset: dashOffset
          }}
        />
        <text
          className="circular-progress-widget-txt"
          x={radius}
          y={radius}
          dy=".4em"
          textAnchor="middle"
        >
          {`${totalPassedCourses}/${totalCourses}`}
        </text>
      </svg>
      <p className="text-course-complete">Courses complete</p>
    </div>
  )
}

export default class ProgressWidget extends React.Component {
  props: {
    program: Program
  }

  renderProgramCertificate() {
    const { program } = this.props

    return (
      <Card className="progress-widget" shadow={0}>
        <img
          className="certificate-thumbnail"
          src="/static/images/diploma_sm.png"
          alt="Certificate"
        />
        <div className="text-course-complete">Congratulations!</div>
        <p className="certificate-text">
          You completed the MicroMasters Certificate in {program.title}
        </p>
        <Button
          className="dashboard-button"
          onClick={() => {
            window.open(program.certificate)
          }}
        >
          View Certificate
        </Button>
      </Card>
    )
  }

  renderProgressIndicator() {
    const { program } = this.props
    const { totalPassedCourses, totalCourses } = programCourseInfo(program)

    return (
      <Card className="progress-widget" shadow={0}>
        <CardTitle className="progress-title">Progress</CardTitle>
        {circularProgressWidget(60, 6, totalPassedCourses, totalCourses)}
      </Card>
    )
  }
  render() {
    const { program } = this.props
    return program.certificate
      ? this.renderProgramCertificate()
      : this.renderProgressIndicator()
  }
}
