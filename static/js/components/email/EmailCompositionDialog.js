// @flow
import React from 'react';
import R from 'ramda';
import Dialog from 'material-ui/Dialog';
import Checkbox from 'material-ui/Checkbox';

import AutomaticEmailOptions from './AutomaticEmailOptions';
import { FETCH_PROCESSING } from '../../actions';
import { dialogActions } from '../inputs/util';
import { isNilOrBlank } from '../../util/util';
import type { EmailState } from '../../flow/emailTypes';
import { ONE_TIME_EMAIL } from './constants';

export default class EmailCompositionDialog extends React.Component {
  props: {
    dialogVisibility:           boolean,
    activeEmail:                EmailState,
    title?:                     string,
    subheadingRenderer?:        (activeEmail: EmailState) => React$Element<*>,
    closeAndClearEmailComposer: () => void,
    closeEmailComposerAndSend:  () => void,
    updateEmailFieldEdit:       () => void,
    showExtraUI?:               boolean,
    setAutomaticEmailType:      (b: string) => void,
  };

  showValidationError = (fieldName: string): ?React$Element<*> => {
    const { activeEmail: { validationErrors } } = this.props;
    let val = validationErrors[fieldName];
    if (val !== undefined) {
      return <span className="validation-error">{ val }</span>;
    }
  };

  renderDefaultSubheading = (activeEmail: EmailState): React$Element<*> => (
    <div className="subheading-section">
      <h5 className="subheading default">{ activeEmail.subheading }</h5>
    </div>
  );

  renderSubheading = (): ?React$Element<*> => {
    const { activeEmail, subheadingRenderer } = this.props;
    if (isNilOrBlank(activeEmail.subheading)) {
      return null;
    } else {
      let renderFunc = subheadingRenderer || this.renderDefaultSubheading;
      return renderFunc(activeEmail);
    }
  };

  automaticCheckbox = () => {
    const {
      activeEmail: { inputs },
      updateEmailFieldEdit,
    } = this.props;

    return <Checkbox
      label="Automatically send this message in the future, whenever new users join who meet these criteria"
      className="email-automatic"
      checked={inputs.sendAutomaticEmails || false}
      value={true}
      onCheck={e => {
        updateEmailFieldEdit('sendAutomaticEmails', {
          target: {
            value: e.target.checked
          }
        });
      }}
    />;
  };

  render() {
    if (!this.props.activeEmail) return null;

    const {
      activeEmail: {
        fetchStatus,
        inputs,
        supportsAutomaticEmails,
        automaticEmailType = ONE_TIME_EMAIL
      },
      title,
      dialogVisibility,
      closeAndClearEmailComposer,
      closeEmailComposerAndSend,
      updateEmailFieldEdit,
      showExtraUI,
      setAutomaticEmailType
    } = this.props;

    return <Dialog
      title={title || "New Email"}
      titleClassName="dialog-title"
      contentClassName="dialog email-composition-dialog"
      className="email-composition-dialog-wrapper"
      open={dialogVisibility}
      actions={
        dialogActions(
          closeAndClearEmailComposer,
          closeEmailComposerAndSend,
          fetchStatus === FETCH_PROCESSING,
          'Send'
        )
      }
      onRequestClose={closeAndClearEmailComposer}
    >
      <div className="email-composition-contents">
        { R.equals(showExtraUI, true) ? <AutomaticEmailOptions automaticEmailType={automaticEmailType}
          setAutomaticEmailType={setAutomaticEmailType} /> : null }
        { this.renderSubheading() }
        <textarea
          rows="1"
          className="email-subject"
          placeholder="Subject"
          value={inputs.subject || ""}
          onChange={updateEmailFieldEdit('subject')}
        />
        { this.showValidationError('subject') }
        <textarea
          rows="7"
          className="email-body"
          placeholder="Type a message"
          value={inputs.body || ""}
          onChange={updateEmailFieldEdit('body')}
        />
        { this.showValidationError('body') }
        {supportsAutomaticEmails ? this.automaticCheckbox() : null}
      </div>
    </Dialog>;
  }
}
