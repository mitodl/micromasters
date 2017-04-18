import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import R from 'ramda';

import {
  sendCourseTeamMail,
  sendSearchResultMail,
  sendLearnerMail
} from '../../lib/api';
import { makeProfileImageUrl, mapObj } from '../../util/util';
import type { Profile } from '../../flow/profileTypes';
import type { Course } from '../../flow/programTypes';
import type { EmailConfig, EmailState, Filter } from '../../flow/emailTypes';
import { actions } from '../../lib/redux_rest.js';
import { SEARCH_FACET_FIELD_LABEL_MAP } from '../../constants';
import { makeCountryNameTranslations } from '../LearnerSearch';

// NOTE: getEmailSendFunction is a function that returns a function. It is implemented this way
// so that we can stub/mock the function that it returns (as we do in integration_test_helper.js)

const countryNameTranslations: Object = makeCountryNameTranslations();
const renderFilterOptions = R.map(filter => {
  let labelKey, labelValue;
  if (R.isEmpty(filter.name)) {
    labelKey = SEARCH_FACET_FIELD_LABEL_MAP[filter.id];
  } else if (filter.name in SEARCH_FACET_FIELD_LABEL_MAP) {
    labelKey = SEARCH_FACET_FIELD_LABEL_MAP[filter.name];
  } else if (filter.name in countryNameTranslations) {
    labelKey = countryNameTranslations[filter.name];
  }

  if (filter.value in countryNameTranslations) {
    labelValue = countryNameTranslations[filter.value];
  } else {
    labelValue = filter.value;
  }

  return (
    <div className="sk-selected-filters-option sk-selected-filters__item" key={filter.id}>
      <div className="sk-selected-filters-option__name">
        {labelKey}: {labelValue}
      </div>
    </div>
  );
});

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
    filters: searchkit.query.getSelectedFilters()
  }),

  getEmailSendFunction: () => sendSearchResultMail,

  emailSendParams: (emailState) => ([
    emailState.inputs.subject || '',
    emailState.inputs.body || '',
    emailState.searchkit.buildQuery().query,
    emailState.inputs.sendAutomaticEmails || false,
  ]),

  renderRecipients: (filters?: Array<Filter>) => {
    if (!filters || filters.length <= 0) {
      return null;
    }
    return (
      <div className="sk-selected-filters-display">
        <div className="sk-selected-filters-title">
          Recipients
        </div>
        <div className="sk-selected-filters">
          {renderFilterOptions(filters)}
        </div>
      </div>
    );
  }
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

export const convertEmailEdit = mapObj(([k, v]) => (
  [k.match(/^subject$|^body$/) ? `email_${k}` : k.replace(/^email_/, ""), v]
));

export const AUTOMATIC_EMAIL_ADMIN_CONFIG: EmailConfig = {
  title: 'Edit Message',
  editEmail: actions.automaticEmails.patch,
  emailOpenParams: R.compose(R.objOf('inputs'), convertEmailEdit),
  emailSendParams: R.compose(convertEmailEdit, R.prop('inputs')),
};
