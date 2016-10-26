// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';
import R from 'ramda';
import type {
  Email,
  EmailValidationErrors
} from '../flow/emailTypes';

const createDialogActions = (close, send) => ([
  <Button
    type="button"
    className="secondary-button cancel-button"
    key="first"
    onClick={close}
  >
    Cancel
  </Button>,
  <Button
    type="button"
    className="primary-button save-button"
    key="second"
    onClick={send}
  >
    Send
  </Button>
]);

const showValidationError = R.curry((getter, object: EmailValidationErrors) => {
  let val = getter(object);
  if ( val !== undefined ) {
    return <span className="validation-error">{ val }</span>;
  }
});

const showSubjectError = showValidationError(R.prop('subject'));

const showBodyError = showValidationError(R.prop('body'));

const hitsCount = searchkit => R.isNil(searchkit) ? 0 : searchkit.getHitsCount();

type EmailDialogProps = {
  closeEmailDialog: () => void,
  updateEmailEdit:  Function,
  open:             boolean,
  email:            Email,
  searchkit:        Object,
  sendEmail:        (e: Email) => void,
};

const EmailCompositionDialog = (props: EmailDialogProps) => {
  const {
    closeEmailDialog,
    updateEmailEdit,
    open,
    email: { email, validationErrors },
    searchkit,
    sendEmail,
  } = props;

  return <Dialog
    title="New Email"
    titleClassName="dialog-title"
    contentClassName="dialog email-composition-dialog"
    className="email-composition-dialog-wrapper"
    open={open}
    actions={createDialogActions(closeEmailDialog, sendEmail)}
    onRequestClose={closeEmailDialog}
  >
    <div className="email-composition-contents">
      <span className="user-count">
        {hitsCount(searchkit)} recipients selected
      </span>
      <textarea
        rows="1"
        className="email-subject"
        placeholder="Subject"
        value={email.subject || ""}
        onChange={updateEmailEdit('subject')}
      />
      { showSubjectError(validationErrors) }
      <textarea
        rows="7"
        className="email-body"
        placeholder="Type a message"
        value={email.body || ""}
        onChange={updateEmailEdit('body')}
      />
      { showBodyError(validationErrors) }
    </div>
  </Dialog>;
};

export default EmailCompositionDialog;
