// @flow
import React from "react"

import CourseListItemWithPopover from "./CourseListItemWithPopover"
import type { ProgramPageCourse } from "../flow/programTypes"

const listItems = courses => {
  return courses.map((course, index) => (
    <CourseListItemWithPopover key={index} course={course} />
  ))
}

export default class CourseListWithPopover extends React.Component {
  props: {
    courses: Array<ProgramPageCourse>
  }

  render() {
    return (
      <div className="info-box course-info">
        <h3 className="title">Courses</h3>
        <div id="course-list">
          <ol className="program-course-list">
            {listItems(this.props.courses)}
          </ol>
        </div>
      </div>
    )
  }
}
