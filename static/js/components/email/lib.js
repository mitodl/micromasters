import React from "react"
import Grid from "@material-ui/core/Grid"
import R from "ramda"
import _ from "lodash"

import {
  sendCourseTeamMail,
  sendSearchResultMail,
  sendLearnerMail
} from "../../lib/api"
import { makeProfileImageUrl, mapObj } from "../../util/util"
import type { Profile } from "../../flow/profileTypes"
import type { Course } from "../../flow/programTypes"
import type {
  AutomaticEmail,
  EmailConfig,
  EmailState,
  Filter
} from "../../flow/emailTypes"
import { actions } from "../../lib/redux_rest.js"
import { SEARCH_FACET_FIELD_LABEL_MAP } from "../../constants"
import { makeTranslations } from "../LearnerSearch"

// NOTE: getEmailSendFunction is a function that returns a function. It is implemented this way
// so that we can stub/mock the function that it returns (as we do in integration_test_helper.js)
export const isLocation = (labelKey: string) =>
  R.or(_.includes(labelKey, "Country"), _.includes(labelKey, "Residence"))

const translations: Object = makeTranslations()
export const renderFilterOptions = R.map(filter => {
  let labelKey, labelValue
  let isTranslated = false
  if (R.isEmpty(filter.name)) {
    labelKey = SEARCH_FACET_FIELD_LABEL_MAP[filter.id]
  } else if (filter.name in SEARCH_FACET_FIELD_LABEL_MAP) {
    labelKey = SEARCH_FACET_FIELD_LABEL_MAP[filter.name]
  } else if (filter.name in translations) {
    labelKey = translations[filter.name]
    isTranslated = true
  }

  if (
    R.or(isLocation(labelKey), isTranslated) &&
    filter.value in translations
  ) {
    labelValue = translations[filter.value]
  } else {
    labelValue = filter.value
  }

  return (
    <div
      className="sk-selected-filters-option sk-selected-filters__item"
      key={filter.id}
    >
      <div className="sk-selected-filters-option__name">
        {labelKey}: {labelValue}
      </div>
    </div>
  )
})

export const COURSE_TEAM_EMAIL_CONFIG: EmailConfig = {
  title:             "Contact the Course Team",
  supportBulkEmails: false,

  renderSubheading: (activeEmail: EmailState) => (
    <div className="subheading-section">
      <Grid container>
        <Grid item xs={1} align={"middle"} className="subheading-to">
          TO:
        </Grid>
        <Grid item xs={11}>
          <h5 className="subheading rounded">{activeEmail.subheading}</h5>
        </Grid>
      </Grid>
    </div>
  ),

  emailOpenParams: (course: Course) => ({
    params:     { courseId: course.id },
    subheading: `${course.title} Course Team`
  }),

  getEmailSendFunction: () => sendCourseTeamMail,

  emailSendParams: emailState => [
    emailState.inputs.subject || "",
    emailState.inputs.body || "",
    emailState.params.courseId
  ]
}

export const SEARCH_RESULT_EMAIL_CONFIG: EmailConfig = {
  title:             "New Email",
  supportBulkEmails: true,

  emailOpenParams: (searchkit: Object) => ({
    subheading:              `${searchkit.getHitsCount() || 0} recipients selected`,
    supportsAutomaticEmails: true,
    filters:                 searchkit.query.getSelectedFilters()
  }),

  getEmailSendFunction: () => sendSearchResultMail,

  emailSendParams: (emailState, searchkit) => [
    emailState.inputs.subject || "",
    emailState.inputs.body || "",
    searchkit.buildQuery().query,
    emailState.inputs.sendAutomaticEmails || false
  ],

  renderRecipients: (filters?: Array<Filter>) => {
    if (!filters || filters.length <= 0) {
      return null
    }
    return (
      <div className="sk-selected-filters-display">
        <div className="sk-selected-filters-title">Recipients</div>
        <div className="sk-selected-filters">
          {renderFilterOptions(filters)}
        </div>
      </div>
    )
  }
}

export const LEARNER_EMAIL_CONFIG: EmailConfig = {
  title:             "Send a Message",
  supportBulkEmails: false,

  renderSubheading: (activeEmail: EmailState) => (
    <div className="subheading-section">
      <Grid container>
        <Grid item xs={1} align={"middle"} className="subheading-to">
          TO:
        </Grid>
        <Grid item xs={11}>
          <div className="subheading profile-image-bubble">
            <img
              src={activeEmail.params.profileImage}
              className="rounded-profile-image small"
              alt={`${activeEmail.subheading} profile image`}
            />
            <span>{activeEmail.subheading}</span>
          </div>
        </Grid>
      </Grid>
    </div>
  ),

  emailOpenParams: (profile: Profile) => ({
    params: {
      studentId:    profile.student_id,
      profileImage: makeProfileImageUrl(profile, true)
    },
    subheading: `${profile.first_name} ${profile.last_name}`
  }),

  getEmailSendFunction: () => sendLearnerMail,

  emailSendParams: emailState => [
    emailState.inputs.subject || "",
    emailState.inputs.body || "",
    emailState.params.studentId
  ]
}

export const convertEmailEdit = mapObj(([k, v]) => [
  k.match(/^subject$|^body$/) ? `email_${k}` : k.replace(/^email_/, ""),
  v
])

export const findFilters = tree => {
  if (tree.hasOwnProperty("term") && !tree.term.hasOwnProperty("program.id")) {
    return [tree.term]
  }

  if (tree.hasOwnProperty("range")) {
    return [tree.range]
  }

  if (R.any(_.isObject, Object.values(tree))) {
    return R.flatten(
      Object.values(tree)
        .filter(_.isObject)
        .map(obj => findFilters(obj))
    )
  }
  return []
}

const serializeValue = (value: Object | string) =>
  _.isObject(value) ? `${value.gte} - ${value.lte}` : value

export const getFilters = (root: Object) => {
  const terms = findFilters(root)
  return _.map(terms, (term: Object) => ({
    id:    Object.keys(term)[0],
    name:  Object.keys(term)[0],
    value: serializeValue(term[Object.keys(term)[0]])
  }))
}

export const AUTOMATIC_EMAIL_ADMIN_CONFIG: EmailConfig = {
  title:           "Edit Email Campaign",
  editEmail:       actions.automaticEmails.patch,
  emailSendParams: R.compose(
    convertEmailEdit,
    R.prop("inputs")
  ),
  supportBulkEmails: true,

  emailOpenParams: (emailOpenParams: AutomaticEmail) => ({
    inputs: {
      subject:             emailOpenParams.email_subject,
      body:                emailOpenParams.email_body,
      sendAutomaticEmails: emailOpenParams.enabled,
      id:                  emailOpenParams.id
    },
    filters: getFilters(emailOpenParams.query.original_query.post_filter)
  }),

  renderRecipients: (filters?: Array<Filter>) => {
    if (!filters || filters.length <= 0) {
      return null
    }
    return (
      <div className="sk-selected-filters-display">
        <div className="sk-selected-filters-title">Recipients</div>
        <div className="sk-selected-filters">
          {renderFilterOptions(filters)}
        </div>
      </div>
    )
  }
}
