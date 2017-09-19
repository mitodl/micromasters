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
      <ol className="program-course-list">{listItems(this.props.courses)}</ol>
    )
  }
}
