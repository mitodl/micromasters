// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import R from 'ramda';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import { FETCH_PROCESSING } from '../../actions';
import { dialogActions } from '../inputs/util';
import { getPropertyOrDefault } from '../../util/util';
import { COURSE_EMAIL_TYPE, SEARCH_EMAIL_TYPE } from './constants';
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
  closeEmailDialog: () => Promise<*>,
  updateEmailEdit:  Function,
  open:             boolean,
  email:            EmailState,
  sendEmail:        () => Promise<*>,
  title?:           string,
  subheadingType?:  string
};

const renderSimpleSubheading = (subheading: string) => (
  <div className="subheading-section">
    <h5 className="subheading">{ subheading }</h5>
  </div>
);

const renderRoundedSubheading = (subheading: string) => (
  <div className="subheading-section">
    <Grid noSpacing={true}>
      <Cell col={1} align={"middle"} className="subheading-to">TO:</Cell>
      <Cell col={11}><h5 className="subheading rounded">{ subheading }</h5></Cell>
    </Grid>
  </div>
);

const emailTypeRendererMap = {
  [SEARCH_EMAIL_TYPE]: renderSimpleSubheading,
  [COURSE_EMAIL_TYPE]: renderRoundedSubheading
};

const renderSubheading = (renderType: ?string, subheading: ?string) => {
  if (R.isNil(subheading) || R.isEmpty(subheading)) {
    return null;
  } else {
    let renderFunc = getPropertyOrDefault(emailTypeRendererMap, renderType, renderSimpleSubheading);
    return renderFunc(subheading);
  }
};

const EmailCompositionDialog = (props: EmailDialogProps) => {
  const {
    closeEmailDialog,
    updateEmailEdit,
    open,
    email: { inputs, subheading, validationErrors, fetchStatus },
    sendEmail,
    title,
    subheadingType
  } = props;

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
      { renderSubheading(subheadingType, subheading) }
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
