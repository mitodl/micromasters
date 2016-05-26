/* global SETTINGS:false */
import React from 'react';
import ReactDOM from 'react-dom';
import ga from 'react-ga';
import moment from 'moment';
import Button from 'react-bootstrap/lib/Button';
import striptags from 'striptags';
import _ from 'lodash';

import PersonalTab from '../components/PersonalTab';
import EducationTab from '../components/EducationTab';
import EmploymentTab from '../components/EmploymentTab';
import PrivacyTab from '../components/PrivacyTab';

import {
  STATUS_NOT_OFFERED,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_VERIFIED_NOT_COMPLETED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_OFFERED_NOT_ENROLLED,
  DASHBOARD_COURSE_HEIGHT,
  DASHBOARD_RUN_HEIGHT,
} from '../constants';

export function sendGoogleAnalyticsEvent(category, action, label, value) {
  let event = {
    category: category,
    action: action,
    label: label,
  };
  if (value !== undefined) {
    event.value = value;
  }
  ga.event(event);
}

function asPercent(number) {
  if (number === undefined || number === null) {
    return "";
  }
  return `${Math.round(number * 100)}%`;
}

/**
 * Determine React elements for the UI given a course status
 * @param {object} course A course coming from the dashboard
 * @param {moment} now The current time
 * @returns {ReactElement} Some React element or string to display for course status
 */
export function makeCourseStatusDisplay(course, now = moment()) {
  let firstRun = {};
  if (course.runs.length > 0) {
    firstRun = course.runs[0];
  }

  switch (course.status) {
  case STATUS_PASSED:
    return <span className="course-list-grade">
      {asPercent(firstRun.grade)}
    </span>;

  case STATUS_VERIFIED_NOT_COMPLETED: {
    if (!firstRun.course_start_date) {
      // Invalid case, API should always send a valid course start date
      return "";
    }

    let courseStartDate = moment(firstRun.course_start_date);
    if (courseStartDate.isAfter(now, 'day')) {
      return `Course starting: ${courseStartDate.format("M/D/Y")}`;
    }

    let grade = firstRun.grade;
    if (grade === undefined || grade === null) {
      // Grade defaults to 0%
      grade = 0;
    }
    return <span className="course-list-grade">
      {asPercent(grade)}
    </span>;
  }
  case STATUS_ENROLLED_NOT_VERIFIED: {
    if (!firstRun.verification_date) {
      // Invalid case, API should always send a valid verification date
      return "";
    }

    let courseUpgradeUrl = `${SETTINGS.edx_base_url}/course_modes/choose/${firstRun.course_id}/`;

    let verificationDate = moment(firstRun.verification_date);
    if (verificationDate.isAfter(now, 'day')) {
      return <Button bsStyle="success" href={courseUpgradeUrl} target="_blank">UPGRADE TO VERIFIED</Button>;
    } else {
      // User cannot verify anymore
      return "";
    }
  }
  case STATUS_OFFERED_NOT_ENROLLED: {
    let courseInfoUrl = `${SETTINGS.edx_base_url}/courses/${firstRun.course_id}/about`;

    if (!firstRun.enrollment_start_date) {
      return firstRun.fuzzy_enrollment_start_date;
    }

    let enrollmentDate = moment(firstRun.enrollment_start_date);
    if (enrollmentDate.isAfter(now, 'day')) {
      return `Enrollment starting: ${enrollmentDate.format("M/D/Y")}`;
    } else {
      return <Button bsStyle="success" href={courseInfoUrl} target="_blank">ENROLL</Button>;
    }
  }
  default:
    // also covers NOT_OFFERED case
    return "";
  }
}

/**
 * Determine progress React element for the UI given a course
 * @param {object} course A course coming from the dashboard
 * @param {bool} isFirst If false, draw a line up to the previous course
 * @param {bool} isLast If false, draw a line down to the next course
 * @param {Number} numRuns The number of course runs to draw a line past
 * @returns {ReactElement} Some React element or string to display for course status
 */
export function makeCourseProgressDisplay(course, isFirst, isLast, numRuns) {
  let outerRadius = 10, innerRadius = 8, width = 30;
  let totalHeight = DASHBOARD_COURSE_HEIGHT + numRuns * DASHBOARD_RUN_HEIGHT;
  let centerX = width/2, centerY = DASHBOARD_COURSE_HEIGHT/2;
  const blue = "#7fbaec";
  const red = "#dc1c2e";

  let topLine;
  if (!isFirst) {
    topLine = <line
      className="top-line"
      x1={centerX}
      x2={centerX}
      y1={0}
      y2={centerY - outerRadius}
      stroke={blue}
      strokeWidth={1}
    />;
  }
  let bottomLine;
  if (!isLast) {
    bottomLine = <line
      className="bottom-line"
      x1={centerX}
      x2={centerX}
      y1={centerY + outerRadius}
      y2={totalHeight}
      stroke={blue}
      strokeWidth={1}
    />;
  }

  let alt = "Course not started";
  let circleColor = blue; // light blue
  let innerElement;
  if (course.status === STATUS_PASSED) {
    // full circle to indicate course passed
    alt = "Course passed";
    innerElement = <circle cx={centerX} cy={centerY} r={innerRadius} fill={blue} />;
  } else if (course.status === STATUS_VERIFIED_NOT_COMPLETED) {
    alt = "Course started";
    // semi circle on the left side
    // see path docs: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#Arcs
    let path = [
      "M", centerX, centerY - innerRadius,
      "A", innerRadius, innerRadius, 0, 0, 0, centerX, centerY + innerRadius
    ].join(" ");
    innerElement = <path
      d={path}
      fill={blue}
    />;
  } else if (course.status === STATUS_NOT_OFFERED) {
    // A course is failed if the first run is NOT_PASSED
    if (course.runs.length > 0 && course.runs[0].status === STATUS_NOT_PASSED) {
      circleColor = red;
    }
  }

  return <svg style={{width: width, height: totalHeight}}>
    <desc>{alt}</desc>
    <circle cx={centerX} cy={centerY} r={outerRadius} stroke={circleColor} fillOpacity={0} />
    {innerElement}
    {topLine}
    {bottomLine}
  </svg>;
}

/**
 * Display status for a course run
 * @param run {Object} A course run
 * @returns {ReactElement}
 */
export function makeRunStatusDisplay(run) {
  switch (run.status) {
  case STATUS_PASSED:
    return "Passed";
  case STATUS_NOT_PASSED:
    return "Not passed";
  default:
    return "";
  }
}

/* eslint-disable camelcase */
/**
 * Validates the profile
 *
 * @param {Object} profile The user profile
 * @returns {Object} Validation errors or an empty object if no errors
 */
export function validateProfile(profile, requiredFields, messages) {
  let errors = {};
  for (let keySet of requiredFields) {
    let val = _.get(profile, keySet);
    if (_.isUndefined(val) || _.isNull(val) || val === "" ) {
      _.set(errors, keySet,  `${messages[keySet.slice(-1)[0]]} is required`);
    }
  }
  return errors;
}

/* eslint-disable camelcase */
/**
 * Generate new education object 
 *
 * @param {String} level The select degree level
 * @returns {Object} New empty education object
 */
export function generateNewEducation(level) {
  return {
    'degree_name': level,
    'graduation_date': null,
    'field_of_study': null,
    'online_degree': false,
    'school_name': null,
    'school_city': null,
    'school_state_or_territory': null,
    'school_country': null
  };
}

/**
 * Generate new work history object
 * 
 * @returns {Object} New empty work history object
 */
export function generateNewWorkHistory() {
  return {
    position: null,
    industry: null,
    company_name: null,
    start_date: null,
    end_date: null,
    city: null,
    country: null,
    state_or_territory: null,
  };
}

/* eslint-enable camelcase */
/*
check that the profile is complete. we make the assumption that a
complete profile consists of:
  - a valid personal tab
  - an entry for 'currently employed', and a work history entry if
    `currently employed == 'yes'`
*/
export function validateProfileComplete(profile) {
  let errors = {};
  let reqFields = [];

  // check personal tab
  errors = validateProfile(
    profile,
    PersonalTab.defaultProps.requiredFields,
    PersonalTab.defaultProps.validationMessages
  );

  if (!_.isEqual(errors, {})) {
    return [false, '/profile/personal', errors];
  }

  // check professional tab
  if (_.isArray(profile.work_history) && !_.isEmpty(profile.work_history)) {
    reqFields = EmploymentTab.validation(profile, reqFields);
    errors = validateProfile(
      profile,
      reqFields,
      EmploymentTab.defaultProps.validationMessages
    );

    if (!_.isEqual(errors, {})) {
      return [false, '/profile/professional', errors];
    }
  }

  // check education tab
  if (_.isArray(profile.education) && !_.isEmpty(profile.education)) {
    reqFields = EducationTab.validation(profile, reqFields);
    errors = validateProfile(
      profile,
      reqFields,
      EducationTab.defaultProps.validationMessages
    );

    if (!_.isEqual(errors, {})) {
      return [false, '/profile/education', errors];
    }
  }

  // check privacy tab
  errors = validateProfile(
    profile,
    PrivacyTab.defaultProps.requiredFields,
    PrivacyTab.defaultProps.validationMessages
  );

  if (!_.isEqual(errors, {})) {
    return [false, '/profile/privacy', errors];
  }

  return [true, null, null];
}

/**
 * Converts string to int using base 10. Stricter in what is accepted than parseInt
 * @param value {String} A value to be parsed
 * @returns {Number|undefined} Either an integer or undefined if parsing didn't work.
 */
const filterPositiveInt = value => {
  if(/^[0-9]+$/.test(value)) {
    return Number(value);
  }
  return undefined;
};

/**
 * Returns the string with any HTML rendered and then its tags stripped
 * @return {String} rendered text stripped of HTML
 */
export function makeStrippedHtml(textOrElement) {
  if (React.isValidElement(textOrElement)) {
    let container = document.createElement("div");
    ReactDOM.render(textOrElement, container);
    return striptags(container.innerHTML);
  } else {
    return striptags(textOrElement);
  }
}

/**
 * Validate a day of month
 * @param {String} string The input string
 * @returns {Number|undefined} The valid date if a valid date value or undefined if not valid
 */
export function validateDay(string) {
  let date = filterPositiveInt(string);
  if (date === undefined) {
    return undefined;
  }
  // More complicated cases like Feb 29 are handled in moment.js isValid
  if (date < 1 || date > 31) {
    return undefined;
  }
  return date;
}

/**
 * Validate a month number
 * @param {String} string The input string
 * @returns {Number|undefined} The valid month if a valid month value or undefined if not valid
 */
export function validateMonth(string) {
  let month = filterPositiveInt(string);
  if (month === undefined) {
    return undefined;
  }
  if (month < 1 || month > 12) {
    return undefined;
  }
  return month;
}

/**
 * Validate a year string is an integer and fits into YYYY
 * @param {String} string The input string
 * @returns {Number|undefined} The valid year if a valid year value or undefined if not valid
 */
export function validateYear(string) {
  let year = filterPositiveInt(string);
  if (year === undefined) {
    return undefined;
  }
  if (year < 1 || year > 9999) {
    // fit into YYYY format
    return undefined;
  }
  return year;
}


export function makeProfileImageUrl(profile) {
  let imageUrl = `${SETTINGS.edx_base_url}/static/images/profiles/default_120.png`.
  //replacing multiple "/" with a single forward slash, excluding the ones following the colon
    replace(/([^:]\/)\/+/g, "$1");
  if (profile.profile_url_large) {
    imageUrl = profile.profile_url_large;
  }

  return imageUrl;
}

/**
 * Returns the preferred name or else the username
 * @param profile {Object} The user profile
 * @returns {string}
 */
export function getPreferredName(profile) {
  return profile.preferred_name || SETTINGS.name || SETTINGS.username;
}