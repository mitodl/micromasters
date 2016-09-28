// @flow
/* global SETTINGS: false */
import React from 'react';
import Dialog from 'material-ui/Dialog';
import { connect } from 'react-redux';

import { createSimpleActionHelpers } from '../util/redux';

import {
  setDialogVisibility,
} from '../actions/signup_dialog';

type signupProps = {
  open:                 boolean,
  setDialogVisibility:  (b: boolean) => void,
};

const dialogStyle = {
  maxWidth: '500px',
};

const SignupDialog = ({
  open,
  setDialogVisibility,
}: signupProps) => {
  return <Dialog
    open={open}
    className="signup-dialog-wrapper"
    onRequestClose={() => setDialogVisibility(false)}
    contentStyle={dialogStyle}
    autoScrollBodyContent={true}
  >
    <div className="signup-dialog">
      <div className="logos">
        <img src="/static/images/edx_logo.png" />
        <img src="/static/images/mit_logo_grey_red.png" />
      </div>
      <span>
        The MIT MicroMasters program is powered by edX.
        To sign up for a MIT MicroMasters program you need an edX account.
      </span>

      <a className="mm-button signup" href="/login/edxorg">
        Continue with edX
      </a>
    </div>
  </Dialog>;
};

const mapStateToProps = state => ({
  open: state.signupDialog.dialogVisibility,
});

const mapDispatchToProps = dispatch => createSimpleActionHelpers(dispatch, [
  ['setDialogVisibility', setDialogVisibility],
]);

export default connect(mapStateToProps, mapDispatchToProps)(SignupDialog);
