// @flow
import React from 'react';
import CourseListItemWithPopover from './CourseListItemWithPopover';

const listItems = (courses) => {
  return courses.map((course, index) =>
    <CourseListItemWithPopover key={index} {...course} />
  );
};

export default class CourseListWithPopover extends React.Component {
  props: {
    courses: Array<CourseListItemWithPopover>,
  }

  render() {
    return (
      <ol className="program-course-list">
        {listItems(this.props.courses)}
      </ol>
    );
  }
}
