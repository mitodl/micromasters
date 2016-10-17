// @flow
/* global SETTINGS:false */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase
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
