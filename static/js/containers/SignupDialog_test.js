// @flow
import { mount } from 'enzyme';
import { assert } from 'chai';
import React from 'react';
import URI from 'urijs';
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

    const link = document.body.querySelector(".signup-dialog a");
    assert.equal(link.getAttribute('href'), `/login/edxorg${queryParams}`);
  });

  it('also checks the coupon query param', () => {
    window.location = "http://fake/?coupon=aBc-123.";
    helper.store.dispatch(setDialogVisibility(true));
    renderDialog();

    const link = document.body.querySelector(".signup-dialog a");
    const expectedNext = URI("/dashboard/").setQuery("coupon", "aBc-123.");
    const expectedUrl = URI("/login/edxorg").setQuery("next", expectedNext);
    assert.equal(link.getAttribute('href'), expectedUrl.toString());
  });

  it('chooses next over coupon', () => {
    window.location = "http://fake/?next=a&coupon=b";
    helper.store.dispatch(setDialogVisibility(true));
    renderDialog();

    const link = document.body.querySelector(".signup-dialog a");
    assert.equal(link.getAttribute('href'), "/login/edxorg?next=a");
  });

  it("doesn't needlessly set a next query param", () => {
    window.location = "http://fake/";
    helper.store.dispatch(setDialogVisibility(true));
    renderDialog();

    const link = document.body.querySelector(".signup-dialog a");
    assert.equal(link.getAttribute('href'), "/login/edxorg");
  });
});
