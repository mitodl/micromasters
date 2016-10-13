// @flow
/* global SETTINGS:false */
import ProgramCourseList from './components/ProgramCourseList';
import React from 'react';
import ReactDOM from 'react-dom';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

const courseListEl = document.querySelector('#program-course-list');

const ThemedProgramCourseList = () => (
  <MuiThemeProvider muiTheme={getMuiTheme()}>
    <ProgramCourseList courses={SETTINGS.courses} />
  </MuiThemeProvider>
);

ReactDOM.render(
  <ThemedProgramCourseList />,
  courseListEl
);
