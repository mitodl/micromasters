import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import TestUtils from 'react-addons-test-utils';

import { SEARCH_RESULT_EMAIL_CONFIG } from './lib';
import * as inputUtil from '../inputs/util';
import { FETCH_PROCESSING } from '../../actions';
import { modifyTextField } from '../../util/test_utils';
import EmailCompositionDialog from './EmailCompositionDialog';
import {
  TEST_EMAIL_TYPE,
  TEST_EMAIL_CONFIG,
  INITIAL_TEST_EMAIL_STATE
} from './test_constants';

describe('EmailCompositionDialog', () => {
  let sandbox, sendStub, closeStub, updateStub;

  const updateObject = (objectToUpdate = {}, updatedProps = {}) => {
    let cloned = _.cloneDeep(objectToUpdate);
    _.forEach(updatedProps, function(value, key) {
      cloned[key] = value;
    });
    return cloned;
  };

  const getDialog = () => document.querySelector('.email-composition-dialog');

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sendStub = sandbox.stub();
    closeStub = sandbox.stub();
    updateStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderDialog = (updatedEmailState = {}, props = {}) => {
    let emailState = updateObject(INITIAL_TEST_EMAIL_STATE[TEST_EMAIL_TYPE], updatedEmailState);
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <EmailCompositionDialog
          updateEmailFieldEdit={() => (updateStub)}
          closeAndClearEmailComposer={closeStub}
          closeEmailComposerAndSend={sendStub}
          dialogVisibility={true}
          activeEmail={emailState}
          title={TEST_EMAIL_CONFIG.title}
          subheadingRenderer={TEST_EMAIL_CONFIG.renderSubheading}
          { ...props }
        />
      </MuiThemeProvider>
    );
  };

  it('should have a title', () => {
    renderDialog();
    assert.equal(document.querySelector('h3').textContent, 'Test Email Dialog');
  });

  it('renders a radio button for setting whether an email is automatic or not', () => {
    renderDialog({
      supportsAutomaticEmails: true,
      inputs: {
        sendAutomaticEmails: false
      }
    });
    const radioGroupDiv = document.querySelector(".type-radio-group");
    assert.equal(radioGroupDiv.childElementCount, 2);
    assert.include(
      document.querySelector(".type-radio-group").textContent,
      'Send a one-time email'
    );
    assert.include(
      document.querySelector(".type-radio-group").textContent,
      'Create an Email Campaign'
    );
  });

  it('should fire the send handler when the "send" button is clicked', () => {
    renderDialog(
      {inputs: {subject: 'abc', body: 'abc'}}
    );
    TestUtils.Simulate.click(getDialog().querySelector('.save-button'));
    assert.isTrue(sendStub.called, "called send handler");
  });

  it('should fire the close handler when the "cancel" button is clicked', () => {
    renderDialog();
    TestUtils.Simulate.click(getDialog().querySelector('.cancel-button'));
    assert.isTrue(closeStub.called, "called send handler");
  });

  it('should show a disabled spinner button if email send is in progress', () => {
    let dialogActionsSpy = sandbox.spy(inputUtil, 'dialogActions');
    renderDialog(
      {fetchStatus: FETCH_PROCESSING}
    );

    // assert that inFlight is true
    assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, true));
    assert.equal(dialogActionsSpy.callCount, 1);
  });

  it('should not show a subheader when subheader text does not exist in the state', () => {
    renderDialog();
    assert.isNull(document.querySelector('.test-subheading'));
  });

  it('should show a subheading when subheading text exists in the state', () => {
    renderDialog(
      {subheading: 'this is a subheading'}
    );
    let subheading = document.querySelector('.test-subheading');
    assert.equal(subheading.tagName, 'DIV');
    assert.equal(subheading.textContent, 'this is a subheading');
  });

  it('should show a default title when one is not passed in', () => {
    renderDialog({}, {title: undefined});
    assert.equal(document.querySelector('h3').textContent, 'New Email');
  });

  ['subject', 'body'].forEach(field => {
    describe(`editing ${field}`, () => {
      let getField = () => document.querySelector(`.email-${field}`);

      it('should show placeholder text if the store value is empty', () => {
        renderDialog();
        assert.notEqual(getField().placeholder, "");
      });

      it('should display the value from the store', () => {
        renderDialog(
          {inputs: {[field]: `${field} value!`}}
        );
        assert.equal(getField().value, `${field} value!`);
      });

      it('should fire the updateEmailEdit callback on change', () => {
        renderDialog();
        let fieldInput = getField();
        modifyTextField(fieldInput, "HI");
        assert.isTrue(updateStub.called, "called update handler");
      });

      it('should show an error if an error for the field is passed in', () => {
        let errorMessage = `${field} error!`;
        renderDialog(
          {validationErrors: {[field]: errorMessage}}
        );
        let message = getDialog().querySelector('.validation-error').textContent;
        assert.equal(message, errorMessage);
      });
    });
  });

  it('should render recipients', () => {
    renderDialog({
      filters: [{
        id: '1',
        name: "key",
        value: "test"
      }]
    }, { renderRecipients: SEARCH_RESULT_EMAIL_CONFIG.renderRecipients });

    assert.include(
      getDialog().querySelector('.sk-selected-filters-option__name').textContent,
      "key: test"
    );
  });
});
