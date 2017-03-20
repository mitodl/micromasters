// @flow
import _ from 'lodash';
import React from 'react';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import IconButton from 'react-mdl/lib/IconButton';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import TestUtils from 'react-addons-test-utils';

import FinalExamCard from './FinalExamCard';
import {
  DASHBOARD_RESPONSE,
  USER_PROFILE_RESPONSE,
} from '../../test_constants';
import {
  PEARSON_PROFILE_ABSENT,
  PEARSON_PROFILE_SUCCESS,
  PEARSON_PROFILE_IN_PROGRESS,
  PEARSON_PROFILE_INVALID,
  PEARSON_PROFILE_SCHEDULABLE
} from '../../constants';
import { INITIAL_PEARSON_STATE } from '../../reducers/pearson';
import { INITIAL_UI_STATE } from '../../reducers/ui';
import { stringStrip } from '../../util/test_utils';

describe('FinalExamCard', () => {
  let sandbox;
  let navigateToProfileStub, submitPearsonSSOStub, showPearsonTOSDialogStub;
  let props;

  let profile = { ...USER_PROFILE_RESPONSE, preferred_name: 'Preferred Name' };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    navigateToProfileStub = sandbox.stub();
    submitPearsonSSOStub = sandbox.stub();
    showPearsonTOSDialogStub = sandbox.stub();
    let program = _.cloneDeep(DASHBOARD_RESPONSE.programs.find(program => (
      program.pearson_exam_status !== undefined
    )));
    props = {
      profile: profile,
      program: program,
      navigateToProfile: navigateToProfileStub,
      submitPearsonSSO: submitPearsonSSOStub,
      pearson: { ...INITIAL_PEARSON_STATE },
      ui: {...INITIAL_UI_STATE},
      showPearsonTOSDialog: showPearsonTOSDialogStub
    };
  });

  let commonText = `You must take a proctored exam for each course. Exams may
be taken at any authorized Pearson test center. Before you can take an exam, you have to
pay for the course and pass the online work.`;

  const getDialog = () => document.querySelector('.dialog-to-pearson-site');
  let renderCard = props => (
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <FinalExamCard {...props} />
      </MuiThemeProvider>
    )
  );

  it('should not render when pearson_exam_status is empty', () => {
    let card = renderCard(props);
    assert.isNull(card.html());
  });

  it('should just show a basic message if the profile is absent', () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_ABSENT;
    let card = renderCard(props);
    assert.include(stringStrip(card.text()), stringStrip(commonText));
    assert.notInclude(
      stringStrip(card.text()),
      "Your Pearson Testing account has been created"
    );
  });

  [PEARSON_PROFILE_SUCCESS, PEARSON_PROFILE_SCHEDULABLE].forEach(status => {
    it(`should let the user know when the profile is ready when the status is ${status}`, () => {
      props.program.pearson_exam_status = status;
      let cardText = stringStrip(renderCard(props).text());
      assert.include(cardText, "Your Pearson Testing account has been created");
    });

    it(`should include profile info if the profile is ${status}`, () => {
      props.program.pearson_exam_status = status;
      let cardText = stringStrip(renderCard(props).text());
      assert.include(cardText, profile.address);
      assert.include(cardText, profile.romanized_first_name);
      assert.include(cardText, profile.romanized_last_name);
      assert.notInclude(cardText, profile.preferred_name);
      assert.include(cardText, stringStrip(profile.phone_number));
      assert.include(cardText, profile.state_or_territory);
    });

    it(`should show a button to edit if the profile is ${status}`, () => {
      props.program.pearson_exam_status = status;
      let card = renderCard(props);
      card.find(IconButton).simulate('click');
      assert(navigateToProfileStub.called);
    });
  });

  it('should let the user know if the profile is in progress', () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_IN_PROGRESS;
    let card = renderCard(props);
    assert.include(
      stringStrip(card.text()),
      "Your updated information has been submitted to Pearson Please check back later"
    );
  });

  it('should let the user know if the profile is invalid', () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_INVALID;
    let card = renderCard(props);
    assert.include(
      stringStrip(card.text()),
      "You need to update your profile in order to take a test at a Pearson Test center"
    );
  });

  it('should show a schedule button when an exam is schedulable', () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE;
    let card = renderCard(props);
    let button = card.find(".exam-button");
    assert.equal(button.text(), 'Schedule an exam');
    button.simulate('click');
    assert(showPearsonTOSDialogStub.called);
  });

  it('should show the titles of schedulable exams', () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE;
    let course  = props.program.courses[0];
    course.can_schedule_exam = true;
    let card = renderCard(props);
    assert.include(
      stringStrip(card.text()),
      `You are ready to schedule an exam for ${stringStrip(course.title)}`
    );
  });

  it('should show a scheduling error, when there is one', () => {
    props.pearson.error = 'ERROR ERROR';
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE;
    let card = renderCard(props);
    assert.include(
      stringStrip(card.text()),
      'ERROR ERROR'
    );
  });

  it('renders confirm pearson TOS dialog', () => {
    props.ui.dialogVisibility = { 'pearsonTOSDialogVisible': true };
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE;
    renderCard(props);
    assert.include(
      document.querySelector('.dialog-container').textContent,
      "Test Registration is completed on the Pearson VUE website"
    );
    assert.include(
      document.querySelector('.dialog-container').textContent,
      'I acknowledge that by clicking Continue I will be leaving the MicroMasters website and going to ' +
      'the Pearson VUE website, and that I accept the Pearson VUE Group’s Terms of Service'
    );
  });

  it('showToPearsonSiteDialog called in cancel', () => {
    props.ui.dialogVisibility = { 'pearsonTOSDialogVisible': true };
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE;
    renderCard(props);
    TestUtils.Simulate.click(getDialog().querySelector(".cancel-button"));
    assert.equal(showPearsonTOSDialogStub.callCount, 1);
  });

  it('submitPearsonSSO called in continue', () => {
    props.ui.dialogVisibility = { 'pearsonTOSDialogVisible': true };
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE;
    renderCard(props);
    let btnContinue = getDialog().querySelector(".save-button");
    assert.equal(btnContinue.textContent, "CONTINUE");
    TestUtils.Simulate.click(btnContinue);
    assert.equal(submitPearsonSSOStub.callCount, 1);
  });
});
