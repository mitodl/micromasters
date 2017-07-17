import React from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import { assert } from 'chai';
import R from 'ramda';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

import PersonalTab from './PersonalTab';
import { PROGRAMS, USER_PROFILE_RESPONSE } from '../test_constants';
import IntegrationTestHelper from '../util/integration_test_helper';

describe("PersonalTab", () => {
  let helper;
  let renderPersonalTab = (selectedProgram = null, props = {}) => {
    let { store } = helper;
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Provider store={store}>
          <PersonalTab
            programs={PROGRAMS}
            ui={{selectedProgram: selectedProgram}}
            dispatch={store.dispatch}
            uneditedProfile={USER_PROFILE_RESPONSE}
            profile={USER_PROFILE_RESPONSE}
            {...props}
          />
        </Provider>
      </MuiThemeProvider>,
      {
        context: { router: {}},
        childContextTypes: { router: PropTypes.object }
      }
    );
  };

  beforeEach(() => {
    helper = new IntegrationTestHelper();
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('should show a list of programs to enroll in for the learner page', () => {
    let wrapper = renderPersonalTab();
    let programOptions = wrapper.find(".program-select").find("Select").props().options;
    assert.equal(programOptions.length, PROGRAMS.length);
    let sortedEnrollments = R.sortBy(R.compose(R.toLower, R.prop('title')))(PROGRAMS);
    programOptions.forEach((menuItem, i) => {
      let program = sortedEnrollments[i];
      assert.equal(program.title, menuItem.label);
      assert.equal(program.id, menuItem.value);
    });
  });

  it('should have the current program enrollment selected', () => {
    let selectedProgram = PROGRAMS[0];
    let wrapper = renderPersonalTab(selectedProgram);
    let props = wrapper.find(".program-select").find("Select").props();
    assert.equal(props.value, selectedProgram.id);
  });
});
