/* global SETTINGS: false */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

import {
  setDialogVisibility,
} from './actions/signup_dialog';
import { signupDialogStore } from './store/configureStore';
import SignupDialog from './containers/SignupDialog';

import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

const store = signupDialogStore();

const dialogDiv = document.querySelector('#signup-dialog');

const openDialog = () => store.dispatch(setDialogVisibility(true));

// find the DOM element and attach openDialog to onClick
let nodes = [...document.querySelectorAll('.open-signup-dialog')];

nodes.forEach(signUpButton => {
  signUpButton.onclick = openDialog;
});

ReactDOM.render(
  <MuiThemeProvider muiTheme={getMuiTheme()}>
    <Provider store={store}>
      <SignupDialog />
    </Provider>
    </MuiThemeProvider>,
  dialogDiv
);
