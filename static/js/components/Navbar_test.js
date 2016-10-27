/* global SETTINGS: false */
import { assert } from 'chai';
import { shallow } from 'enzyme';
import React from 'react';
import Link from 'react-router/lib/Link';

import Navbar from './Navbar';
import {
  USER_PROFILE_RESPONSE,
  DASHBOARD_RESPONSE,
  PROGRAM_ENROLLMENTS,
} from '../constants';

describe('Navbar', () => {
  const props = {
    profile: USER_PROFILE_RESPONSE,
    dashboard: { programs: DASHBOARD_RESPONSE },
    programs: { programEnrollments: PROGRAM_ENROLLMENTS },
  };

  let renderNavbar = () => shallow(<Navbar {...props} />);

  it('has a link to the dashboard if the user has no roles', () => {
    let wrapper = renderNavbar();
    let hrefs = wrapper.find(Link).map(link => link.props()['to']);
    assert.deepEqual(hrefs, [
      '/dashboard',
      '/learner/jane',
      '/settings',
      '/dashboard',
      '/dashboard'
    ]);
  });

  it('has a link to the learner page if the user is staff or instructor', () => {
    for (let role of ['staff', 'instructor']) {
      SETTINGS.roles = [{ role }];
      let wrapper = renderNavbar();
      let hrefs = wrapper.find(Link).map(link => link.props()['to']);
      assert.deepEqual(hrefs, [
        '/dashboard',
        '/learner/jane',
        '/settings',
        '/learners',
        '/learners',
      ]);
    }
  });
});
