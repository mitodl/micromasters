// @flow
import React from 'react';
import CourseListItemWithPopover from './CourseListItemWithPopover';


export default class CourseListWithPopover extends React.Component {
  props: {
    courses: Array<CourseListItemWithPopover>,
  }

  render() {
    const listItems = (courses) => {
      return courses.map((course, index) =>
        <CourseListItemWithPopover key={index} {...course} />
      );
    };

    return (
      <ol className="program-course-list">
        {listItems(this.props.courses)}
      </ol>
    );
  }
}
