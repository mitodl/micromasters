import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import {
  sendCourseTeamMail,
  sendSearchResultMail
} from '../../actions/email';
import type { Course } from '../../flow/programTypes';
import { EmailConfig } from '../../flow/emailTypes';

export const COURSE_TEAM_EMAIL_CONFIG: EmailConfig = {
  title: 'Contact the Course Team',

  renderSubheading: (subheading: ?string) => (
    <div className="subheading-section">
      <Grid noSpacing={true}>
        <Cell col={1} align={"middle"} className="subheading-to">TO:</Cell>
        <Cell col={11}><h5 className="subheading rounded">{ subheading }</h5></Cell>
      </Grid>
    </div>
  ),

  emailOpenParams: (course: Course) => ({
    params: {courseId: course.id},
    subheading: `${course.title} Course Team`
  }),

  emailSendAction: (emailState) => (
    sendCourseTeamMail(
      emailState.inputs.subject || '',
      emailState.inputs.body || '',
      emailState.params.courseId
    )
  )
};

export const SEARCH_RESULT_EMAIL_CONFIG: EmailConfig = {
  title: 'New Email',

  emailOpenParams: (searchkit: Object) => ({
    params: {},
    subheading: `${searchkit.getHitsCount() || 0} recipients selected`
  }),

  emailSendAction: (emailState) => (
    sendSearchResultMail(
      emailState.inputs.subject || '',
      emailState.inputs.body || '',
      emailState.searchkit.buildQuery().query
    )
  )
};
