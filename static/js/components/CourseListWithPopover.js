// @flow
import React from "react"

import CourseListItemWithPopover from "./CourseListItemWithPopover"
import type {
  ProgramPageCourse,
  ProgramPageElectiveSet
} from "../flow/programTypes"

const listItems = courses => {
  return courses.map((course, index) => (
    <CourseListItemWithPopover key={index} course={course} />
  ))
}

function populateElectivesList(electiveSet) {
  return (
    electiveSet.courses.length > 0 && (
      <div>
        <h3 className="elective">{electiveSet.title}</h3>
        <h2 className="required-completion">
          (Complete {electiveSet.required_number} of{" "}
          {electiveSet.courses.length})
        </h2>
        <hr className="solid-elective" />
        <div id="course-list-elective">
          <ol className="program-course-list">
            {listItems(electiveSet.courses)}
          </ol>
        </div>
      </div>
    )
  )
}

export default class CourseListWithPopover extends React.Component {
  props: {
    courses: Array<ProgramPageCourse>,
    electiveSets: Array<ProgramPageElectiveSet>
  }

  render() {
    return (
      <div className="info-box course-info">
        <h3 className="title">Courses</h3>
        <div>
          {this.props.electiveSets.length > 0 && (
            <div>
              <h3 className="core">CORE</h3>
              <h2 className="required-completion">(Complete all)</h2>
              <hr className="solid-core" />
            </div>
          )}
        </div>

        <div id="course-list-core">
          <ol className="program-course-list">
            {listItems(this.props.courses)}
          </ol>
        </div>

        <div>
          {this.props.electiveSets.map(electiveSet =>
            populateElectivesList(electiveSet)
          )}
        </div>
      </div>
    )
  }
}
