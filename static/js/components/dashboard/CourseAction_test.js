// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseListCard from './CourseListCard';
import CourseRow from './CourseRow';
import { DASHBOARD_RESPONSE } from '../../constants';

describe('CourseAction', () => {
  it('shows a check mark for a passed course', () => {

  });

  it('shows nothing for a failed course', () => {

  });

  it('shows nothing for a verified course', () => {

  });

  it('shows nothing for a verified course with course start date of yesterday', () => {

  });

  it('shows nothing for a verified course with course start date of today', () => {

  });

  it('shows nothing for a verified course with course start date of tomorrow', () => {

  });

  it('shows an upgrade button if user is not verified but is enrolled', () => {

  });

  it('shows a disabled enroll button if user is not enrolled and there is no enrollment date', () => {
    // there should also be text below the button
  });

  it('shows a disabled enroll button if user is not enrolled and enrollment starts in future', () => {
    // there should also be text below the button
  });

  it('shows an enroll button if user is not enrolled and enrollment starts today', () => {

  });

  it('shows an enroll button if user is not enrolled and enrollment started already', () => {

  });

  it('is an offered course with no edx_course_key -- is this even possible?', () => {

  });

  it('is not an offered course and user has not failed', () => {

  });
});
