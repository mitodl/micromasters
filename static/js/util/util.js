// @flow
/* global SETTINGS:false */
import React from 'react';
import ReactDOM from 'react-dom';
import striptags from 'striptags';
import _ from 'lodash';
import { codeToCountryName } from '../lib/location';
import { S } from '../lib/sanctuary';
const { Maybe, Just, Nothing } = S;
import R from 'ramda';

import {
  STATUS_PASSED,
  EDUCATION_LEVELS,
  PROFILE_STEP_LABELS,
  PROFILE_STEP_ORDER,
} from '../constants';
import type {
  Profile,
  EducationEntry,
  WorkHistoryEntry,
  ValidationErrors,
} from '../flow/profileTypes';
import type {
  Program,
  Course,
  CourseRun,
} from '../flow/programTypes';
import { workEntriesByDate } from './sorting';
import type { CheckoutPayload } from '../flow/checkoutTypes';

export const isProfileOfLoggedinUser = (profile: Profile): boolean => (
  SETTINGS.user && profile.username === SETTINGS.user.username
);

export function userPrivilegeCheck (profile: Profile, privileged: any, unPrivileged: any): any {
  if ( SETTINGS.user && profile.username === SETTINGS.user.username ) {
    return _.isFunction(privileged) ? privileged() : privileged;
  } else {
    return _.isFunction(unPrivileged) ? unPrivileged() : unPrivileged;
  }
}

export function makeProfileProgressDisplay(active: ?string) {
  const width = 750, height = 100, radius = 20, paddingX = 40, paddingY = 5;
  const numCircles = PROFILE_STEP_LABELS.size;

  // width from first circle edge left to the last circle edge right
  const circlesWidth = width - (paddingX * 2 + radius * 2);
  // x distance between two circle centers
  const circleDistance = Math.floor(circlesWidth / (numCircles - 1));
  const textY = (height - (radius * 2)) / 2 + radius * 2;
  const circleY = radius + paddingY;

  const lightGreyText = "#888";
  const colors = {
    completed: {
      fill: "#a31f34",
      circleText: "white",
      text: lightGreyText,
      fontWeight: 400,
    },
    current: {
      fill: "#a31f34",
      circleText: "white",
      text: lightGreyText,
      fontWeight: 400,
    },
    future: {
      fill: "#ffffff",
      circleText: "#444444",
      text: lightGreyText,
      fontWeight: 400,
    }
  };

  const elements = [];

  let activeTab = [...PROFILE_STEP_LABELS.keys()].findIndex(k => k === active);
  [...PROFILE_STEP_LABELS.entries()].forEach(([, label], i) => {
    let colorScheme;
    if (i < activeTab) {
      colorScheme = colors.completed;
    } else if (i === activeTab) {
      colorScheme = colors.current;
    } else {
      colorScheme = colors.future;
    }

    const circleX = paddingX + radius + circleDistance * i;
    const nextCircleX = paddingX + radius + circleDistance * (i + 1);

    let circleLabel = () => {
      if ( i < activeTab ) {
        return <svg
          fill="white"
          height="24"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
          x={circleX - 12}
          y={circleY - 12}
          key={`check_${i}`}
        >
          <path d="M0 0h24v24H0z" fill="none"/>
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>;
      } else {
        return <text
          key={`circletext_${i}`}
          x={circleX}
          y={circleY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: colorScheme.circleText,
            fontWeight: 700,
            fontSize: i < activeTab ? "16pt" : "12pt"
          }}
        >
          { i + 1 }
        </text>;
      }
    };

    elements.push(
      <circle
        key={`circle_${i}`}
        cx={circleX}
        cy={circleY}
        r={radius}
        fill={colorScheme.fill}
      />,
      <text
        key={`text_${i}`}
        x={circleX}
        y={textY}
        textAnchor="middle"
        style={{
          fill: colorScheme.text,
          fontWeight: colorScheme.fontWeight,
          fontSize: "12pt"
        }}
      >
        {label}
      </text>,
      circleLabel()
    );

    if (i !== numCircles - 1) {
      elements.push(
        <line
          key={`line_${i}`}
          x1={circleX + radius}
          x2={nextCircleX - radius}
          y1={circleY}
          y2={circleY}
          stroke={"#cccccc"}
          strokeWidth={1}
        />
      );
    }
  });

  return <svg style={{width: width, height: height}}>
    <desc>Profile progress: {PROFILE_STEP_LABELS.get(active)}</desc>
    {elements}
  </svg>;
}

const getStepIndices = R.map(R.indexOf(R.__, PROFILE_STEP_ORDER));
const lastStep = R.last(PROFILE_STEP_ORDER);

/**
 * Determine the lesser of the current step or the first incomplete step
 */
export const currentOrFirstIncompleteStep = R.compose(
    R.nth(R.__, PROFILE_STEP_ORDER),
    R.reduce(R.min, Infinity),
    getStepIndices,
    R.reject(R.isNil),
    R.append(lastStep),
    R.pair
);

/* eslint-disable camelcase */
/**
 * Generate new education object
 */
export function generateNewEducation(level: string): EducationEntry {
  return {
    'degree_name': level,
    'graduation_date': "",
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
 */
export function generateNewWorkHistory(): WorkHistoryEntry {
  return {
    position: "",
    industry: "",
    company_name: "",
    start_date: "",
    end_date: null,
    city: "",
    country: null,
    state_or_territory: null,
  };
}



/**
 * Converts string to int using base 10. Stricter in what is accepted than parseInt
 */
export const filterPositiveInt = (value: ?string|number): number|void => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if ( typeof value === 'number') {
    return value;
  }
  if(/^[0-9]+$/.test(value)) {
    return Number(value);
  }
  return undefined;
};

/**
 * Returns the string with any HTML rendered and then its tags stripped
 */
export function makeStrippedHtml(textOrElement: any): string {
  if (React.isValidElement(textOrElement)) {
    let container = document.createElement("div");
    ReactDOM.render(textOrElement, container);
    return striptags(container.innerHTML);
  } else {
    return striptags(textOrElement);
  }
}

export function makeProfileImageUrl(profile: Profile, useSmall: ?boolean): string {
  let imageUrl = '/static/images/avatar_default.png';
  if (profile !== undefined && profile.image_medium) {
    imageUrl = profile.image_medium;
  }
  if (profile.image_small && useSmall) {
    imageUrl = profile.image_small;
  }

  return imageUrl;
}

/**
 * Returns the preferred name or else the username
 */
export function getPreferredName(profile: Profile, last: boolean = true): string {
  let first = profile.preferred_name || profile.first_name || profile.username;
  return last && profile.last_name && !profile.preferred_name ? `${first} ${profile.last_name}` : first;
}

/**
 * returns the users location
 */
export function getLocation(profile: Profile, showState: boolean = true): string {
  let { country, state_or_territory, city } = profile;
  let subCountryLocation, countryLocation;
  city = city ? `${city}, ` : "";

  if ( country === 'US' ) {
    let state = state_or_territory.replace(/^\D{2}-/, '');
    subCountryLocation = showState ? `${city}${state}, ` : city;
    countryLocation = 'US';
  } else {
    subCountryLocation = city;
    countryLocation = codeToCountryName(country);
  }
  return `${subCountryLocation}${countryLocation}`;
}

/**
 * returns the user's most recent (or current) employer
*/
export function getEmployer(profile: Profile): Maybe<string> {
  let entries = workEntriesByDate(profile.work_history);
  if ( _.isEmpty(entries) ) {
    return Nothing();
  }
  let [, entry] = entries[0];
  if ( entry.company_name ) {
    return Just(entry.company_name);
  }
  return Nothing();
}

export function calculateDegreeInclusions(profile: Profile) {
  let highestLevelFound = false;
  let inclusions = {};
  for (const { value } of EDUCATION_LEVELS) {
    inclusions[value] = highestLevelFound ? false : true;
    if (value === profile.edx_level_of_education) {
      // every level after this point is higher than the user has attained according to edx
      highestLevelFound = true;
    }
  }

  // turn on all switches where the user has data
  for (const { value } of EDUCATION_LEVELS) {
    if (profile.education.filter(education => education.degree_name === value).length > 0) {
      inclusions[value] = true;
    }
  }
  return inclusions;
}

/**
 * Calls an array of functions in series with a given argument and returns an array of the results
 */
export function callFunctionArray<R: any, F: (a: any) => R>(functionArray: Array<F>, arg: any): R[] {
  return functionArray.map((func) => func(arg));
}

/**
 * takes an 'error' object and a keyset, and returns a class selector if an
 * error is present
 */
export function validationErrorSelector(errors: ValidationErrors, keySet: string[]) {
  return _.get(errors, keySet) ? "invalid-input" : "";
}

/**
 * Formats a number between 0 and 1 as a percent, eg "57%"
 */
export function asPercent(number: number): string {
  if (number === undefined || number === null) {
    return "";
  } else if (!isFinite(number)) {
    return "";
  }
  return `${Math.round(number * 100)}%`;
}

/**
 * Creates a POST form with hidden input fields
 * @param url the url for the form action
 * @param payload Each key value pair will become an input field
 */
export function createForm(url: string, payload: CheckoutPayload): HTMLFormElement {
  const form = document.createElement("form");
  form.setAttribute("action", url);
  form.setAttribute("method", "post");
  form.setAttribute("class", "cybersource-payload");

  for (let key: string of Object.keys(payload)) {
    const value = payload[key];
    const input = document.createElement("input");
    input.setAttribute("name", key);
    input.setAttribute("value", value);
    input.setAttribute("type", "hidden");
    form.appendChild(input);
  }
  return form;
}

/**
 * Formats course price.
 */
export function formatPrice(price: ?string|number): string {
  if (price === null || price === undefined) {
    return '';
  } else {
    return `$${price}`;
  }
}

/**
 * Returns total courses and passed courses in program.
 */
export function programCourseInfo(program: Program): Object {
  let totalCourses = 0;
  let totalPassedCourses = 0;

  if (program.courses) {
    totalCourses = program.courses.length;
    let passedCourses = program.courses.filter(
      // returns true if any course run has a `status` property set to STATUS_PASSED.
      // $FlowFixMe: Flow thinks second arg is not a valid predicate
      course => _.some(course.runs, ["status", STATUS_PASSED])
    );
    totalPassedCourses = passedCourses.length;
  }

  return {
    'totalPassedCourses': totalPassedCourses,
    'totalCourses': totalCourses
  };
}

export function findCourseRun(
  programs: Array<Program>,
  selector: (courseRun: CourseRun|null, course: Course|null, program: Program|null) => boolean,
): [CourseRun|null, Course|null, Program|null] {
  for (let program of programs) {
    try {
      if (selector(null, null, program)) {
        return [null, null, program];
      }
    } catch (e) {
      // silence exception here so that selector doesn't need to worry about it
    }
    for (const course of program.courses) {
      try {
        if (selector(null, course, program)) {
          return [null, course, program];
        }
      } catch (e) {
        // silence exception here so that selector doesn't need to worry about it
      }
      for (const courseRun of course.runs) {
        try {
          if (selector(courseRun, course, program)) {
            return [courseRun, course, program];
          }
        } catch (e) {
          // silence exception here so that selector doesn't need to worry about it
        }
      }
    }
  }
  return [null, null, null];
}

export const classify: (s: string) => string = (
  R.compose(R.replace(/_/g,'-'), _.snakeCase, R.defaultTo(""))
);

export const labelSort = R.sortBy(R.compose(R.toLower, R.prop('label')));

/**
 * Return first, last, preferred_name names if available else username
 */
export function getUserDisplayName(profile: Profile): string {
  let first = profile.first_name || profile.username;
  let last =  profile.last_name || '';
  let preferred_name = (profile.preferred_name && (profile.preferred_name !== first)) ?
    ` (${profile.preferred_name})` : '';

  return `${first} ${last}${preferred_name}`;
}
