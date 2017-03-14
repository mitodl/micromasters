// @flow
/* global SETTINGS: false */
import React from 'react';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

import StaffLearnerInfoCard from './StaffLearnerInfoCard';
import { DASHBOARD_RESPONSE } from '../test_constants';
import { stringStrip } from '../util/test_utils';
import { STATUS_OFFERED } from '../constants';
import CourseDescription from '../components/dashboard/CourseDescription';
import CourseGrade from '../components/dashboard/CourseGrade';

describe('StaffLearnerInfoCard', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    SETTINGS.roles.push({ role: 'staff' });
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderCard = () => (
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <StaffLearnerInfoCard
          program={DASHBOARD_RESPONSE[0]}
        />
      </MuiThemeProvider>
    )
  );

  it('should have the program title', () => {
    let card = renderCard();
    assert.include(
      stringStrip(card.text()),
      `Progress ${DASHBOARD_RESPONSE[0].title}`
    );
  });

  it('should render the progress display', () => {
    let card = renderCard();
    assert.include(
      stringStrip(card.text()),
      "1 4 Courses complete"
    );
  });

  it('should show information for course runs the user is enrolled in', () => {
    let numRuns = DASHBOARD_RESPONSE[0]
      .courses
      .reduce((acc, course) => acc.concat(course.runs), [])
      .filter(run => run.status !== STATUS_OFFERED)
      .length;

    let card = renderCard();
    assert.equal(card.find(CourseDescription).length, numRuns);
    assert.equal(card.find(CourseGrade).length, numRuns);
  });
});
