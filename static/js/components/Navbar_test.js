/* global SETTINGS: false */
import { assert } from 'chai';
import { shallow } from 'enzyme';
import React from 'react';
import Link from 'react-router/lib/Link';

import Navbar from './Navbar';


describe('Navbar', () => {
  it('has a link to the dashboard if the user has no roles', () => {
    let wrapper = shallow(<Navbar />);
    wrapper.find(Link).forEach(link => {
      assert.equal(link.props()['to'], "/dashboard");
    });
  });

  it('has a link to the learner page if the user is staff or instructor', () => {
    for (let role of ['staff', 'instructor']) {
      SETTINGS.roles = [{ role }];
      let wrapper = shallow(<Navbar />);
      wrapper.find(Link).forEach(link => {
        assert.equal(link.props()['to'], "/learners");
      });
    }
  });
});
