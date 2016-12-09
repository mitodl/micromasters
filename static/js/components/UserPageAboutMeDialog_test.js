import React from 'react';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import TestUtils from 'react-addons-test-utils';

import { FETCH_PROCESSING } from '../actions';
import UserPageAboutMeDialog from './UserPageAboutMeDialog';
import { USER_PROFILE_RESPONSE } from '../constants';

describe('UserPageAboutMeDialog', () => {
  let sandbox;
  let setUserPageDialogVisibility, clearProfileEdit, saveProfile;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    setUserPageDialogVisibility = sandbox.stub();
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
        <UserPageAboutMeDialog
          profile={USER_PROFILE_RESPONSE}
          setUserPageAboutMeDialogVisibility={setUserPageDialogVisibility}
          clearProfileEdit={clearProfileEdit}
          saveProfile={saveProfile}
          ui={{
            userPageAboutMeDialogVisibility: true
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
        userPageAboutMeDialogVisibility: false
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
    renderDialog({
      profilePatchStatus: FETCH_PROCESSING
    });
    let saveButton = getDialog().querySelector(".save-button");
    assert(saveButton.className.includes("disabled-with-spinner"));
    assert(saveButton.querySelector(".mdl-spinner"));
    TestUtils.Simulate.click(saveButton);
    assert.equal(saveProfile.callCount, 0);
  });
});
