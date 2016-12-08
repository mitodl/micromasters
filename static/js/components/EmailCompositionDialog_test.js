import React from 'react';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import TestUtils from 'react-addons-test-utils';

import { INITIAL_EMAIL_STATE, NEW_EMAIL_EDIT } from '../reducers/email';
import { modifyTextField } from '../util/test_utils';

import EmailCompositionDialog from './EmailCompositionDialog';

describe('EmailCompositionDialog', () => {
  let sandbox, updateStub, getHitsCount, closeEmailDialog, updateEmailEdit, sendEmail;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    updateStub = sandbox.stub();
    getHitsCount = sandbox.stub().returns(20);
    closeEmailDialog = sandbox.stub().returns(updateStub);
    updateEmailEdit = sandbox.stub().returns(updateStub);
    sendEmail = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const getDialog = () => document.querySelector('.email-composition-dialog');

  const renderDialog = (props = {}) => (
    mount (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <EmailCompositionDialog
          closeEmailDialog={closeEmailDialog}
          updateEmailEdit={updateEmailEdit}
          open={true}
          email={{
            ...INITIAL_EMAIL_STATE,
            email: NEW_EMAIL_EDIT
          }}
          searchkit={{
            getHitsCount: getHitsCount
          }}
          sendEmail={sendEmail}
          {...props}
        />
      </MuiThemeProvider>
    )
  );

  it('should have a title', () => {
    renderDialog();
    assert.equal(document.querySelector('h3').textContent, 'New Email');
  });

  it('should have a results count', () => {
    renderDialog();
    let count = document.querySelector('.user-count').textContent;
    assert.equal(count, '20 recipients selected');
    assert(
      getHitsCount.called,
      "called searchkit getHitsCount method"
    );
  });

  it('should fire sendSearchResultMail when the "send" button is clicked', () => {
    renderDialog();
    TestUtils.Simulate.click(getDialog().querySelector('.save-button'));
    assert(sendEmail.called, "called sendSearchResultMail method");
  });

  ['subject', 'body'].forEach(field => {
    describe(`editing ${field}`, () => {
      let getField = () => document.querySelector(`.email-${field}`);

      it('should show placeholder text if the store value is empty', () => {
        renderDialog();
        assert.notEqual(getField().placeholder, "");
      });

      it('should display the value from the store', () => {
        renderDialog({
          email: {
            ...INITIAL_EMAIL_STATE,
            email: {
              ...NEW_EMAIL_EDIT,
              [field]: "a field value!"
            }
          }
        });
        assert.equal(getField().value, "a field value!");
      });

      it('should fire the updateEmailEdit callback on change', () => {
        renderDialog();
        let field = getField();
        modifyTextField(field, "HI");
        assert(updateStub.called, "onChange callback was called");
      });

      it('should show an error if an error for the field is passed in', () => {
        let errorMessage = `An error message for ${field}`;
        renderDialog({
          email: {
            ...INITIAL_EMAIL_STATE,
            validationErrors: {
              [field]: errorMessage
            }
          }
        });
        let message = getDialog().querySelector('.validation-error').textContent;
        assert.equal(message, errorMessage);
      });
    });
  });
});
