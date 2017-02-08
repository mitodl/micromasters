import React from 'react';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import TestUtils from 'react-addons-test-utils';

import * as inputUtil from '../components/inputs/util';
import { FETCH_PROCESSING } from '../actions';
import LearnerPageAboutMeDialog from './LearnerPageAboutMeDialog';
import { USER_PROFILE_RESPONSE } from '../test_constants';

describe('LearnerPageAboutMeDialog', () => {
  let sandbox;
  let setLearnerPageDialogVisibility, clearProfileEdit, saveProfile;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    setLearnerPageDialogVisibility = sandbox.stub();
    clearProfileEdit = sandbox.stub();
    saveProfile = sandbox.stub();
    saveProfile.returns(Promise.resolve());
  });

  afterEach(() => {
    sandbox.restore();
  });

  const getDialog = () => document.querySelector('.about-me-dialog');
  const renderDialog = (props = {}) => (
    mount (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <LearnerPageAboutMeDialog
          profile={USER_PROFILE_RESPONSE}
          setLearnerPageAboutMeDialogVisibility={setLearnerPageDialogVisibility}
          clearProfileEdit={clearProfileEdit}
          saveProfile={saveProfile}
          ui={{
            learnerPageAboutMeDialogVisibility: true
          }}
          {...props}
        />
      </MuiThemeProvider>,
      {
        context: { router: {}},
        childContextTypes: { router: React.PropTypes.object }
      }
    )
  );

  it('render dialog with data', () => {
    renderDialog({
      profile: {
        ...USER_PROFILE_RESPONSE,
        about_me: "Hello world"
      }
    });
    assert.equal(document.querySelector('h3.dialog-title').textContent, "About Me");
    assert.equal(document.querySelector("textarea").textContent, "Hello world");
  });

  it('render dialog without data', () => {
    renderDialog();
    assert.equal(document.querySelector('h3.dialog-title').textContent, "About Me");
    assert.equal(document.querySelector("textarea").textContent, "");
  });

  it('render dialog when visibility set to false', () => {
    renderDialog({
      ui: {
        learnerPageAboutMeDialogVisibility: false
      }
    });
    assert.isNull(document.querySelector('h3.dialog-title'));
    assert.isNull(document.querySelector("textarea"));
  });

  it('clearProfileEdit called in cancel', () => {
    renderDialog();
    TestUtils.Simulate.click(getDialog().querySelector(".cancel-button"));
    assert.equal(clearProfileEdit.callCount, 1);
  });

  it('saveProfile called in save', () => {
    renderDialog();
    TestUtils.Simulate.click(getDialog().querySelector(".save-button"));
    assert.equal(saveProfile.callCount, 1);
  });

  it('disables the save button during profile update', () => {
    let dialogActionsSpy = sandbox.spy(inputUtil, 'dialogActions');
    renderDialog({
      profilePatchStatus: FETCH_PROCESSING
    });
    // assert that inFlight is true
    assert.isTrue(dialogActionsSpy.lastCall.args[2]);
    assert.equal(dialogActionsSpy.callCount, 1);
  });
});
