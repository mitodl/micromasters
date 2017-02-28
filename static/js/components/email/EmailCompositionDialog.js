// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';

import { FETCH_PROCESSING } from '../../actions';
import { dialogActions } from '../inputs/util';
import { isNilOrBlank } from '../../util/util';
import type { EmailState } from '../../flow/emailTypes';

export default class EmailCompositionDialog extends React.Component {
  props: {
    dialogVisibility:           boolean,
    activeEmail:                EmailState,
    title?:                     string,
    subheadingRenderer?:        (subheading: ?string) => React$Element<*>,
    closeAndClearEmailComposer: () => void,
    closeEmailComposerAndSend:  () => void,
    updateEmailFieldEdit:       () => void
  };

  showValidationError = (fieldName: string): ?React$Element<*> => {
    const { activeEmail: { validationErrors } } = this.props;
    let val = validationErrors[fieldName];
    if (val !== undefined) {
      return <span className="validation-error">{ val }</span>;
    }
  };

  renderDefaultSubheading = (subheading: ?string): React$Element<*> => (
    <div className="subheading-section">
      <h5 className="subheading">{ subheading }</h5>
    </div>
  );

  renderSubheading = (): ?React$Element<*> => {
    const {
      activeEmail: { subheading },
      subheadingRenderer
    } = this.props;
    if (isNilOrBlank(subheading)) {
      return null;
    } else {
      let renderFunc = subheadingRenderer || this.renderDefaultSubheading;
      return renderFunc(subheading);
    }
  };

  render() {
    if (!this.props.activeEmail) return null;

    const {
      activeEmail: { fetchStatus, inputs },
      title,
      dialogVisibility,
      closeAndClearEmailComposer,
      closeEmailComposerAndSend,
      updateEmailFieldEdit
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
      </div>
    </Dialog>;
  }
}
