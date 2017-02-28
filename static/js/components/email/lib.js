import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import {
  sendCourseTeamMail,
  sendSearchResultMail,
  sendLearnerMail
} from '../../lib/api';
import { makeProfileImageUrl } from '../../util/util';
import type { Profile } from '../../flow/profileTypes';
import type { Course } from '../../flow/programTypes';
import type { EmailConfig, EmailState } from '../../flow/emailTypes';

// NOTE: getEmailSendFunction is a function that returns a function. It is implemented this way
// so that we can stub/mock the function that it returns (as we do in integration_test_helper.js)

export const COURSE_TEAM_EMAIL_CONFIG: EmailConfig = {
  title: 'Contact the Course Team',

  renderSubheading: (activeEmail: EmailState) => (
    <div className="subheading-section">
      <Grid noSpacing={true}>
        <Cell col={1} align={"middle"} className="subheading-to">TO:</Cell>
        <Cell col={11}><h5 className="subheading rounded">{ activeEmail.subheading }</h5></Cell>
      </Grid>
    </div>
  ),

  emailOpenParams: (course: Course) => ({
    params: {courseId: course.id},
    subheading: `${course.title} Course Team`
  }),

  getEmailSendFunction: () => sendCourseTeamMail,

  emailSendParams: (emailState) => ([
    emailState.inputs.subject || '',
    emailState.inputs.body || '',
    emailState.params.courseId
  ])
};

export const SEARCH_RESULT_EMAIL_CONFIG: EmailConfig = {
  title: 'New Email',

  emailOpenParams: (searchkit: Object) => ({
    subheading: `${searchkit.getHitsCount() || 0} recipients selected`,
    supportsAutomaticEmails: true,
  }),

  getEmailSendFunction: () => sendSearchResultMail,

  emailSendParams: (emailState) => ([
    emailState.inputs.subject || '',
    emailState.inputs.body || '',
    emailState.searchkit.buildQuery().query,
    emailState.inputs.sendAutomaticEmails || false,
 ])
};

export const LEARNER_EMAIL_CONFIG: EmailConfig = {
  title: 'Send a Message',

  renderSubheading: (activeEmail: EmailState) => (
    <div className="subheading-section">
      <Grid noSpacing={true}>
        <Cell col={1} align={"middle"} className="subheading-to">TO:</Cell>
        <Cell col={11}>
          <div className="subheading profile-image-bubble">
            <img
              src={activeEmail.params.profileImage}
              className='rounded-profile-image small'
              alt={`${activeEmail.subheading} profile image`}
            />
            <span>{ activeEmail.subheading }</span>
          </div>
        </Cell>
      </Grid>
    </div>
  ),

  emailOpenParams: (profile: Profile) => ({
    params: {
      studentId: profile.student_id,
      profileImage: makeProfileImageUrl(profile, true)
    },
    subheading: `${profile.first_name} ${profile.last_name}`
  }),

  getEmailSendFunction: () => sendLearnerMail,

  emailSendParams: (emailState) => ([
    emailState.inputs.subject || '',
    emailState.inputs.body || '',
    emailState.params.studentId
  ])
};
