// @flow
import React from 'react';
import { assert } from 'chai';
import MenuItem from 'material-ui/MenuItem';
import _ from 'lodash';
import { shallow } from 'enzyme';
import Dialog from 'material-ui/Dialog';
import SelectField from 'material-ui/SelectField';

import { FETCH_PROCESSING } from '../actions';
import { DASHBOARD_SUCCESS_ACTIONS } from '../containers/test_util';
import * as enrollmentActions from '../actions/programs';
import * as uiActions from '../actions/ui';
import {
  DASHBOARD_RESPONSE,
  PROGRAMS,
} from '../test_constants';
import ProgramEnrollmentDialog from './ProgramEnrollmentDialog';
import IntegrationTestHelper from '../util/integration_test_helper';

describe("ProgramEnrollmentDialog", () => {
  let helper;
  beforeEach(() => {
    helper = new IntegrationTestHelper();
  });

  afterEach(() => {
    helper.cleanup();
  });

  const renderEnrollmentDialog = (props = {}) => {
    return shallow(
      <ProgramEnrollmentDialog
        programs={PROGRAMS}
        visibility={true}
        {...props}
      />
    );
  };

  it('renders a dialog', () => {
    return helper.renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      let dialog = wrapper.find(ProgramEnrollmentDialog).at(0);
      let props = dialog.props();

      assert.deepEqual(props.programs, PROGRAMS);
    });
  });

  for (let [uiAction, funcName, propName, value] of [
    ['setEnrollProgramDialogError', 'setError', 'error', 'error'],
    ['setEnrollProgramDialogVisibility', 'setVisibility', 'visibility', true],
    ['setEnrollSelectedProgram', 'setSelectedProgram', 'selectedProgram', 3],
  ]) {
    it(`dispatches ${funcName}`, () => {
      let stub = helper.sandbox.spy(uiActions, uiAction);
      return helper.renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        let handler = wrapper.find(ProgramEnrollmentDialog).at(0).props()[funcName];
        handler(value);
        assert(stub.calledWith(value));
      });
    });

    it(`the prop ${propName} comes from the state`, () => {
      helper.store.dispatch(uiActions[uiAction](value));

      return helper.renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
        let actual = wrapper.find(ProgramEnrollmentDialog).at(0).props()[propName];
        assert.equal(actual, value);
      });
    });
  }

  it('dispatches addProgramEnrollment', () => {
    let stub = helper.sandbox.stub(enrollmentActions, 'addProgramEnrollment');
    stub.returns({type: "fake"});
    return helper.renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      let handler = wrapper.find(ProgramEnrollmentDialog).at(0).props().enrollInProgram;
      handler(3);
      assert(stub.calledWith(3));
    });
  });

  it('can select the program enrollment via SelectField', () => {
    let enrollment = PROGRAMS[0];
    let stub = helper.sandbox.stub();
    let wrapper = renderEnrollmentDialog({
      setSelectedProgram: stub
    });
    wrapper.find(SelectField).props().onChange(null, null, enrollment);
    assert(stub.calledWith(enrollment));
  });

  it('can dispatch an addProgramEnrollment action for the currently selected enrollment', () => {
    let selectedEnrollment = PROGRAMS[0];
    let enrollStub = helper.sandbox.stub();
    let wrapper = renderEnrollmentDialog({
      enrollInProgram: enrollStub,
      selectedProgram: selectedEnrollment,
    });
    let button = wrapper.find(Dialog).props().actions.find(
      button => button.props.className.includes("enroll")
    );
    button.props.onClick();
    assert(enrollStub.calledWith(selectedEnrollment));
  });

  for (let activity of [true, false]) {
    it(`spins the save button spinner depending on activity=${activity.toString()}`, () => {
      let wrapper = renderEnrollmentDialog({
        fetchAddStatus: activity ? FETCH_PROCESSING : undefined
      });
      let button = wrapper.find(Dialog).props().actions.find(
        button => button.props.className.includes("enroll")
      );
      assert.equal(button.type.name, 'SpinnerButton');
      assert.equal(button.props.spinning, activity);
    });
  }

  it("shows an error if the user didn't select any program when they click enroll", () => {
    let stub = helper.sandbox.stub();
    let wrapper = renderEnrollmentDialog({
      setError: stub
    });
    let button = wrapper.find(Dialog).props().actions.find(
      button => button.props.className.includes("enroll")
    );
    button.props.onClick();
    assert(stub.calledWith("No program selected"));
  });

  it("clears the dialog when the user clicks cancel", () => {
    let stub = helper.sandbox.stub();
    let wrapper = renderEnrollmentDialog({
      setVisibility: stub
    });
    let button = wrapper.find(Dialog).props().actions.find(
      button => button.props.className.includes("cancel")
    );
    button.props.onClick();
    assert(stub.calledWith(false));
  });

  it("only shows programs which the user is not already enrolled in", () => {
    let enrollmentLookup = new Map(PROGRAMS.map(enrollment => [enrollment.id, null]));
    let unenrolledPrograms = DASHBOARD_RESPONSE.filter(program => !enrollmentLookup.has(program.id));
    unenrolledPrograms = _.sortBy(unenrolledPrograms, 'title');
    unenrolledPrograms = unenrolledPrograms.map(program => ({
      title: program.title,
      id: program.id,
    }));

    let selectedEnrollment = PROGRAMS[0];

    let wrapper = renderEnrollmentDialog({
      visibility: false,
      selectedProgram: selectedEnrollment
    });

    let list = wrapper.find(MenuItem).map(menuItem => {
      let props = menuItem.props();
      return {
        title: props.primaryText,
        id: props.value
      };
    });

    assert.deepEqual(list, unenrolledPrograms);
  });

  it("shows the current enrollment in the SelectField", () => {
    let selectedEnrollment = PROGRAMS[0];

    let wrapper = renderEnrollmentDialog({
      selectedProgram: selectedEnrollment,
      visibility: false
    });
    let select = wrapper.find(SelectField);
    assert.equal(select.props().value, selectedEnrollment);
  });
});
