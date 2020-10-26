// @flow
import React from "react"

import CourseListItemWithPopover from "./CourseListItemWithPopover"
import type { ProgramPageCourse } from "../flow/programTypes"

const listItems = courses => {
  return courses.map((course, index) => (
    <CourseListItemWithPopover key={index} course={course} />
  ))
}

function getCoreCourses(props) {
  return props.courses.filter(
    course => !course.elective_tag || course.elective_tag === "core"
  )
}

function getElectiveCourses(props) {
  return props.courses.filter(course => course.elective_tag === "elective")
}

export default class CourseListWithPopover extends React.Component {
  props: {
    courses: Array<ProgramPageCourse>,
    electivesRequiredNumber: number
  }
  electiveCourses = getElectiveCourses(this.props)
  coreCourses = getCoreCourses(this.props)

  render() {
    return (
      <div className="info-box course-info">
        <h3 className="title">Courses</h3>
        <div>
          {this.electiveCourses.length > 0 && (
            <div>
              <h3 className="core">CORE</h3>
              <h2 className="required-completion">(Complete all)</h2>
              <hr className="solid-core" />
            </div>
          )}
        </div>

        <div id="course-list-core">
          <ol className="program-course-list">{listItems(this.coreCourses)}</ol>
        </div>
        <div>
          {this.electiveCourses.length > 0 && (
            <div>
              <h3 className="elective">ELECTIVE</h3>
              <h2 className="required-completion">
                (Complete {this.props.electivesRequiredNumber} of{" "}
                {this.electiveCourses.length})
              </h2>
              <hr className="solid-elective" />
            </div>
          )}
        </div>

        <div id="course-list-elective">
          <ol className="program-course-list">
            {listItems(this.electiveCourses)}
          </ol>
        </div>
      </div>
    )
  }
}
