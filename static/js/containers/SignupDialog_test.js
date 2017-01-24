// @flow
import { mount } from 'enzyme';
import { assert } from 'chai';
import React from 'react';
import { Provider } from 'react-redux';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

import { setDialogVisibility } from '../actions/signup_dialog';
import SignupDialog from './SignupDialog';
import IntegratedTestHelper from '../util/integration_test_helper';

describe("SignupDialog", () => {
  let helper;

  beforeEach(() => {
    helper = new IntegratedTestHelper();
  });

  afterEach(() => {
    helper.cleanup();
  });

  const renderDialog = (props = {}) => {
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
      <Provider store={helper.store}>
        <SignupDialog {...props} />
      </Provider>
      </MuiThemeProvider>,
    );
  };

  it('has a login link which uses the next query param', () => {
    let queryParams = "?next=b";
    window.location = `http://fake/${queryParams}`;
    helper.store.dispatch(setDialogVisibility(true));
    renderDialog();

    let link = document.body.querySelector(".signup-dialog a");
    assert.equal(link.getAttribute('href'), `/login/edxorg${queryParams}`);
  });
});
