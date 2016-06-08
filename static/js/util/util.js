/* global SETTINGS:false */
import React from 'react';
import ReactDOM from 'react-dom';
import ga from 'react-ga';
import striptags from 'striptags';
import _ from 'lodash';

import { EDUCATION_LEVELS } from '../constants';

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

export function userPrivilegeCheck (profile, privileged, unPrivileged) {
  if ( profile.username === SETTINGS.username ) {
    return _.isFunction(privileged) ? privileged() : privileged;
  } else {
    return _.isFunction(unPrivileged) ? unPrivileged() : unPrivileged;
  }
}

export function makeProfileProgressDisplay(active) {
  const width = 750, height = 100, radius = 20, paddingX = 40, paddingY = 5;
  const tabNames = ["Personal", "Education", "Professional", "Profile Privacy"];
  const numCircles = tabNames.length;

  // width from first circle edge left to the last circle edge right
  const circlesWidth = width - (paddingX * 2 + radius * 2);
  // x distance between two circle centers
  const circleDistance = Math.floor(circlesWidth / (numCircles - 1));
  const textY = (height - (radius * 2)) / 2 + radius * 2;
  const circleY = radius + paddingY;

  const greenFill = "#00964e", greenLine = "#7dcba7";
  const greyStroke = "#ececec", lightGreyText = "#b7b7b7", darkGreyText = "#888888";
  const greyFill = "#eeeeee", greyCircle = "#dddddd";
  const colors = {
    completed: {
      fill: greenFill,
      stroke: "white",
      circleText: "white",
      text: greenFill,
      line: greenLine
    },
    current: {
      fill: "white",
      stroke: greyStroke,
      circleText: "black",
      text: "black",
      line: greyStroke
    },
    future: {
      fill: greyFill,
      stroke: greyCircle,
      circleText: darkGreyText,
      text: lightGreyText,
      line: greyStroke
    }
  };

  const elements = [];

  for (let i = 0; i < numCircles; ++i) {
    let colorScheme;
    if (i < active) {
      colorScheme = colors.completed;
    } else if (i === active) {
      colorScheme = colors.current;
    } else {
      colorScheme = colors.future;
    }

    const circleX = paddingX + radius + circleDistance * i;
    const nextCircleX = paddingX + radius + circleDistance * (i + 1);
    elements.push(
      <circle
        key={`circle_${i}`}
        cx={circleX}
        cy={circleY}
        r={radius}
        stroke={colorScheme.stroke}
        fill={colorScheme.fill}
      />,
      <text
        key={`text_${i}`}
        x={circleX}
        y={textY}
        textAnchor="middle"
        style={{
          fill: colorScheme.text,
          fontWeight: 700,
          fontSize: "12pt"
        }}
      >
        {tabNames[i]}
      </text>,
      <text
        key={`circletext_${i}`}
        x={circleX}
        y={circleY}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fill: colorScheme.circleText,
          fontWeight: 700,
          fontSize: "12pt"
        }}
      >
        {i + 1}
      </text>
    );
    if (i !== numCircles - 1) {
      elements.push(
        <line
          key={`line_${i}`}
          x1={circleX + radius}
          x2={nextCircleX - radius}
          y1={circleY}
          y2={circleY}
          stroke={colorScheme.line}
          strokeWidth={2}
        />
      );
    }
  }

  return <svg style={{width: width, height: height}}>
    <desc>Profile progress: {tabNames[active]}</desc>
    {elements}
  </svg>;
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



/**
 * Converts string to int using base 10. Stricter in what is accepted than parseInt
 * @param value {String} A value to be parsed
 * @returns {Number|undefined} Either an integer or undefined if parsing didn't work.
 */
export const filterPositiveInt = value => {
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

export function calculateDegreeInclusions(profile) {
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
