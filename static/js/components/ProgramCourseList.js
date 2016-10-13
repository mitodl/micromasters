// @flow
import React from 'react';
import ProgramCourse from './ProgramCourse';


export default class ProgramCourseList extends React.Component {
  props: {
    courses: Array<Object>,
  }
  render() {
    const courseDetails = this.props.courses.map((course, index) =>
      <ProgramCourse key={index} {...course} />
    );
    return (
      <ol className="program-course-list">
        {courseDetails}
      </ol>
    );
  }
}
