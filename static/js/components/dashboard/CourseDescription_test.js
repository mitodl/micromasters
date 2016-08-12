// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseListCard from './CourseListCard';
import CourseRow from './CourseRow';
import { DASHBOARD_RESPONSE } from '../../constants';

describe('CourseDescription', () => {
  it('shows the course title', () => {

  });

  it('shows (enrolled) for enrolled but not verified courses', () => {

  });

  it('shows failure text for failed courses', () => {

  });

  it('shows upgrade instructions for enrolled but not verified courses', () => {

  });

  it('shows Complete for passed courses', () => {

  });

  it('shows Begins ... for offered courses that havent started yet', () => {

  });

  it('shows nothing for offered courses are past the start date', () => {

  });

  it('shows Coming ... for offered courses without a specific start date', () => {

  });

  it('shows nothing for a verified courses', () => {

  });

  it('shows nothing for not offered courses', () => {

  });
});
