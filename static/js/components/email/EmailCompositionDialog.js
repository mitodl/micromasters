// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';

import AutomaticEmailOptions from './AutomaticEmailOptions';
import { FETCH_PROCESSING } from '../../actions';
import { dialogActions } from '../inputs/util';
import { isNilOrBlank } from '../../util/util';
import type { EmailState, Filter } from '../../flow/emailTypes';

export default class EmailCompositionDialog extends React.Component {
  props: {
    dialogVisibility:           boolean,
    activeEmail:                EmailState,
    title?:                     string,
    subheadingRenderer?:        (activeEmail: EmailState) => React$Element<*>,
    closeAndClearEmailComposer: () => void,
    closeEmailComposerAndSend:  () => void,
    updateEmailFieldEdit:       () => void,
    renderRecipients?:          (filters: ?Array<Filter>) => React$Element<*>
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

  setSendAutomaticEmails = (sendAutomaticEmails: boolean): void => {
    const { updateEmailFieldEdit } = this.props;
    updateEmailFieldEdit('sendAutomaticEmails', {
      target: {
        value: sendAutomaticEmails
      }
    });
  }

  renderAutomaticEmailSettings = (sendAutomaticEmails: boolean): React$Element<*> => (
    <AutomaticEmailOptions
      sendAutomaticEmails={sendAutomaticEmails}
      setSendAutomaticEmails={this.setSendAutomaticEmails}
    />
  );

  render() {
    if (!this.props.activeEmail) return null;

    const {
      activeEmail: { fetchStatus, inputs, supportsAutomaticEmails, filters },
      title,
      dialogVisibility,
      closeAndClearEmailComposer,
      closeEmailComposerAndSend,
      updateEmailFieldEdit,
      renderRecipients,
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
        { supportsAutomaticEmails ? this.renderAutomaticEmailSettings(inputs.sendAutomaticEmails || false) : null }
        { this.renderSubheading() }
        { renderRecipients ? renderRecipients(filters) : null }
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
      </div>
    </Dialog>;
  }
}
