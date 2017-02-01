// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import R from 'ramda';

import { FETCH_PROCESSING } from '../../actions';
import { dialogActions } from '../inputs/util';
import type {
  EmailState,
  EmailValidationErrors
} from '../../flow/emailTypes';

const showValidationError = R.curry((getter, object: EmailValidationErrors) => {
  let val = getter(object);
  if (val !== undefined) {
    return <span className="validation-error">{ val }</span>;
  }
});

const showSubjectError = showValidationError(R.prop('subject'));

const showBodyError = showValidationError(R.prop('body'));

type EmailDialogProps = {
  closeEmailDialog: () => void,
  updateEmailEdit:  Function,
  open:             boolean,
  email:            EmailState,
  sendEmail:        () => void,
  title?:           string,
  children?:        any,
};

const EmailCompositionDialog = (props: EmailDialogProps) => {
  const {
    closeEmailDialog,
    updateEmailEdit,
    open,
    email: { inputs, validationErrors, fetchStatus },
    sendEmail,
    title,
    children
  } = props;

  let subHeading;
  if (children) {
    subHeading = <h5 className="sub-heading">{ children }</h5>;
  }

  return <Dialog
    title={title || "New Email"}
    titleClassName="dialog-title"
    contentClassName="dialog email-composition-dialog"
    className="email-composition-dialog-wrapper"
    open={open}
    actions={dialogActions(closeEmailDialog, sendEmail, fetchStatus === FETCH_PROCESSING, 'Send')}
    onRequestClose={closeEmailDialog}
  >
    <div className="email-composition-contents">
      { subHeading }
      <textarea
        rows="1"
        className="email-subject"
        placeholder="Subject"
        value={inputs.subject || ""}
        onChange={updateEmailEdit('subject')}
      />
      { showSubjectError(validationErrors) }
      <textarea
        rows="7"
        className="email-body"
        placeholder="Type a message"
        value={inputs.body || ""}
        onChange={updateEmailEdit('body')}
      />
      { showBodyError(validationErrors) }
    </div>
  </Dialog>;
};

export default EmailCompositionDialog;
