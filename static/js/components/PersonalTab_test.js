import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import R from 'ramda';

import PersonalTab from './PersonalTab';
import { PROGRAMS } from '../constants';

describe("PersonalTab", () => {

  let renderPersonalTab = (selectedProgram = null, props = {}) => {
    return shallow(<PersonalTab
      programs={PROGRAMS}
      ui={{
        selectedProgram: selectedProgram,
      }}
      {...props}
    />);
  };

  it('should show a list of programs to enroll in for the learner page', () => {
    let wrapper = renderPersonalTab();
    let menuItems = wrapper.find("MenuItem");
    assert.equal(menuItems.length, PROGRAMS.length);
    let sortedEnrollments = R.sortBy(R.compose(R.toLower, R.prop('title')))(PROGRAMS);
    menuItems.forEach((menuItem, i) => {
      let program = sortedEnrollments[i];
      assert.equal(program.title, menuItem.props()['primaryText']);
      assert.equal(program.id, menuItem.props()['value']);
    });
  });

  it('should have the current program enrollment selected', () => {
    let selectedProgram = PROGRAMS[0];

    let wrapper = renderPersonalTab(selectedProgram);
    assert.equal(wrapper.find("SelectField").props()['value'], selectedProgram.id);
  });
});
