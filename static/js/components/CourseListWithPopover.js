// @flow
import React from 'react';
import CourseListItemWithPopover from './CourseListItemWithPopover';


export default class CourseListWithPopover extends React.Component {
  props: {
    courses: Array<Object>,
  }
  render() {
    const courseDetails = this.props.courses.map((course, index) =>
      <CourseListItemWithPopover key={index} {...course} />
    );
    return (
      <ol className="program-course-list">
        {courseDetails}
      </ol>
    );
  }
}
