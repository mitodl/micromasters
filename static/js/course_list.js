// @flow
/* global SETTINGS:false */
import CourseListWithPopover from './components/CourseListWithPopover';
import React from 'react';
import ReactDOM from 'react-dom';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

const courseListEl = document.querySelector('#course-list');

ReactDOM.render(
  <MuiThemeProvider muiTheme={getMuiTheme()}>
    <CourseListWithPopover courses={SETTINGS.courses} />
  </MuiThemeProvider>,
  courseListEl
);
