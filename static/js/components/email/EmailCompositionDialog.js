// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import R from 'ramda';
import { Editor } from 'react-draft-wysiwyg';
// $FlowFixMe: Flow thinks this module isn't present for some reason
import { EditorState, ContentState, convertFromHTML, Modifier } from 'draft-js';

import { AUTOMATIC_EMAIL_ADMIN_TYPE } from './constants';
import AutomaticEmailOptions from './AutomaticEmailOptions';
import RecipientVariableButton from './RecipientVariableButton';
import { FETCH_PROCESSING } from '../../actions';
import { dialogActions } from '../inputs/util';
import { isNilOrBlank } from '../../util/util';
import type { EmailState, Filter } from '../../flow/emailTypes';
import { S, getm } from '../../lib/sanctuary';

// this takes an HTML string and returns a draft-js EditorState object
// unfortunately draft-js has a lot of state and wants to manage it all itself,
// so we take the HTML we save to the backend and instantiate an EditorState object
// with it, which we can then keep in the state for our EmailCompositionDialog component.
const convertHTMLToEditorState = (html: string): Object => {
  let blocksFromHTML = convertFromHTML(html);
  let contentState = ContentState.createFromBlockArray(
    blocksFromHTML.contentBlocks,
    blocksFromHTML.entityMap,
  );
  return EditorState.createWithContent(contentState);
};

// this attempts to pull the email body out of `props`, and, if it's
// present and non-empty, attempts to instantiate an EditorState object
// and format it into something we can set as the state for our component.
// Otherwise, we set our state to be a blank object, which will cause the
// <Editor /> component to create a blank EditorState of its own accord.
const editorStateFromProps = R.compose(
  S.maybe({editorState: EditorState.createEmpty()}, R.objOf('editorState')),
  S.map(convertHTMLToEditorState),
  S.filter(R.compose(R.not, R.isEmpty)),
  getm('body'),
  R.pathOr({}, ['activeEmail', 'inputs']),
);

const draftWysiwygToolbar = {
  options: [
    'inline',
    'list',
    'link',
    'history',
    'remove',
    'blockType',
  ], 
  inline: {
    options: ['bold', 'italic', 'underline'],
  },
  list: {
    options: ['unordered', 'ordered'],
  },
};

type EmailDialogProps = {
  dialogVisibility:           boolean,
  activeEmail:                EmailState,
  title?:                     string,
  subheadingRenderer?:        (activeEmail: EmailState) => React$Element<*>,
  closeAndClearEmailComposer: () => void,
  closeEmailComposerAndSend:  () => Promise<void>,
  updateEmailFieldEdit:       () => void,
  renderRecipients?:          (filters: ?Array<Filter>) => React$Element<*>,
  updateEmailBody:            (e: Object) => void,
  dialogType:                 string
};

export default class EmailCompositionDialog extends React.Component {
  state: {
    editorState: Object,
  };

  props: EmailDialogProps;

  constructor (props: EmailDialogProps) {
    super(props);
    this.state = editorStateFromProps(props);
  }

  componentWillReceiveProps (nextProps: EmailDialogProps) {
    if (!this.state.editorState.getCurrentContent().hasText()) {
      this.setState(editorStateFromProps(nextProps));
    }
  }

  insertRecipientVariable = (variableName: string) => {

    const {editorState} = this.state;
    let selection = editorState.getSelection();
    const entityKey = editorState
      .getCurrentContent()
      .createEntity('MENTION', 'IMMUTABLE', {})
      .getLastCreatedEntityKey();

    let contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      selection,
      `${variableName}`,
      editorState.getCurrentInlineStyle(),
      entityKey,
    );
    let newEditorState = EditorState.push(editorState, contentState, 'insert-characters');
    // insert a blank space after the variable
    selection = newEditorState.getSelection().merge({
      anchorOffset: selection.get('anchorOffset') + variableName.length,
      focusOffset: selection.get('anchorOffset') + variableName.length,
    });
    newEditorState = EditorState.acceptSelection(newEditorState, selection);
    contentState = Modifier.insertText(
      newEditorState.getCurrentContent(),
      selection,
      ' ',
      newEditorState.getCurrentInlineStyle(),
      undefined,
    );
    this.onEditorStateChange(EditorState.push(newEditorState, contentState, 'insert-characters'));

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

  onEditorStateChange = (editorState: EditorState) => {
    const { updateEmailBody } = this.props;
    updateEmailBody(editorState);
    this.setState({ editorState });
  };

  clearEditorState = () => {
    this.setState({ editorState: EditorState.createEmpty() });
  };

  closeEmailComposerAndSend = () => {
    const { closeEmailComposerAndSend } = this.props;
    closeEmailComposerAndSend().then(this.clearEditorState, () => undefined);
  };

  closeEmailComposeAndClear = () => {
    const { closeAndClearEmailComposer } = this.props;
    closeAndClearEmailComposer();
    this.clearEditorState();
  };

  makeCustomToolbarButtons = R.map((variableName: string) => {
    return <RecipientVariableButton
      value={variableName}
      key={variableName}
      onClick={()=>(this.insertRecipientVariable(`[${variableName}]`))}
    />;
  });

  okButtonLabel = (dialogType: string) => (
    dialogType === AUTOMATIC_EMAIL_ADMIN_TYPE ? 'Save Changes' : 'Send'
  );

  render() {
    if (!this.props.activeEmail) return null;

    const {
      activeEmail: { fetchStatus, inputs, supportsAutomaticEmails, filters },
      title,
      dialogVisibility,
      updateEmailFieldEdit,
      renderRecipients,
      dialogType
    } = this.props;
    const { editorState } = this.state;

    return <Dialog
      title={title || "New Email"}
      titleClassName="dialog-title"
      contentClassName="dialog email-composition-dialog"
      className="email-composition-dialog-wrapper"
      open={dialogVisibility}
      actions={
        dialogActions(
          this.closeEmailComposeAndClear,
          this.closeEmailComposerAndSend,
          fetchStatus === FETCH_PROCESSING,
          this.okButtonLabel(dialogType)
        )
      }
      onRequestClose={this.closeEmailComposeAndClear}
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
        <Editor
          wrapperClassName="email-body"
          editorState={editorState}
          onEditorStateChange={this.onEditorStateChange}
          toolbar={draftWysiwygToolbar}
        />
        <div className="toolbar-below">
          <div className="insert" >Insert:</div>
          {this.makeCustomToolbarButtons(['PreferredName', 'Email'])}
        </div>
        { this.showValidationError('body') }
      </div>
    </Dialog>;
  }
}
