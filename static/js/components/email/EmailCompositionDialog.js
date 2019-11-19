// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"
import R from "ramda"
// $FlowFixMe: Flow thinks this module isn't present for some reason
import { Editor } from "react-draft-wysiwyg"
// $FlowFixMe: Flow thinks this module isn't present for some reason
import { EditorState, ContentState, convertFromHTML, Modifier } from "draft-js"

import { AUTOMATIC_EMAIL_ADMIN_TYPE } from "./constants"
import AutomaticEmailOptions from "./AutomaticEmailOptions"
import RecipientVariableButton from "./RecipientVariableButton"
import { FETCH_PROCESSING } from "../../actions"
import { RECIPIENT_VARIABLE_NAMES } from "../../constants"
import { dialogActions } from "../inputs/util"
import { isNilOrBlank } from "../../util/util"
import type { EmailState, Filter } from "../../flow/emailTypes"
import { S, getm } from "../../lib/sanctuary"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import DialogActions from "@material-ui/core/DialogActions"

// this takes an HTML string and returns a draft-js EditorState object
// unfortunately draft-js has a lot of state and wants to manage it all itself,
// so we take the HTML we save to the backend and instantiate an EditorState object
// with it, which we can then keep in the state for our EmailCompositionDialog component.
const convertHTMLToEditorState = (html: string): Object => {
  const blocksFromHTML = convertFromHTML(html)
  if (blocksFromHTML.contentBlocks) {
    const contentState = ContentState.createFromBlockArray(
      blocksFromHTML.contentBlocks,
      blocksFromHTML.entityMap
    )
    return EditorState.createWithContent(contentState)
  } else {
    return EditorState.createEmpty()
  }
}

// this attempts to pull the email body out of `props`, and, if it's
// present and non-empty, attempts to instantiate an EditorState object
// and format it into something we can set as the state for our component.
// Otherwise, we set our state to be a blank object, which will cause the
// <Editor /> component to create a blank EditorState of its own accord.
const editorStateFromProps = R.compose(
  S.maybe({ editorState: EditorState.createEmpty() }, R.objOf("editorState")),
  S.map(convertHTMLToEditorState),
  S.filter(
    R.compose(
      R.not,
      R.isEmpty
    )
  ),
  getm("body"),
  R.pathOr({}, ["activeEmail", "inputs"])
)

const draftWysiwygToolbar = {
  options: ["inline", "list", "link", "history", "remove", "blockType"],
  inline:  {
    options: ["bold", "italic", "underline"]
  },
  list: {
    options: ["unordered", "ordered"]
  }
}

type EmailDialogProps = {
  dialogVisibility: boolean,
  activeEmail: EmailState,
  title?: string,
  subheadingRenderer?: (activeEmail: EmailState) => React$Element<*>,
  closeAndClearEmailComposer: () => void,
  closeEmailComposerAndSend: () => Promise<void>,
  updateEmailFieldEdit: () => void,
  renderRecipients?: (filters: ?Array<Filter>) => React$Element<*>,
  updateEmailBody: (e: Object) => void,
  dialogType: string,
  supportBulkEmails: boolean
}

export default class EmailCompositionDialog extends React.Component {
  state: {
    editorState: Object
  }

  props: EmailDialogProps

  constructor(props: EmailDialogProps) {
    super(props)
    this.state = editorStateFromProps(props)
  }

  static getDerivedStateFromProps(nextProps: EmailDialogProps, prevState) {
    const newState = editorStateFromProps(nextProps)
    const newStateHasText = newState.editorState.getCurrentContent().hasText()

    if (
      !prevState.editorState.getCurrentContent().hasText() &&
      newStateHasText
    ) {
      return newState
    }
    return null
  }

  insertRecipientVariable = (variableName: string) => {
    const { editorState } = this.state
    let selection = editorState.getSelection()
    const entityKey = editorState
      .getCurrentContent()
      .createEntity("MENTION", "IMMUTABLE", {})
      .getLastCreatedEntityKey()

    let contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      selection,
      `${variableName}`,
      editorState.getCurrentInlineStyle(),
      entityKey
    )
    let newEditorState = EditorState.push(
      editorState,
      contentState,
      "insert-characters"
    )
    // insert a blank space after the variable
    selection = newEditorState.getSelection().merge({
      anchorOffset: selection.get("anchorOffset") + variableName.length,
      focusOffset:  selection.get("anchorOffset") + variableName.length
    })
    newEditorState = EditorState.acceptSelection(newEditorState, selection)
    contentState = Modifier.insertText(
      newEditorState.getCurrentContent(),
      selection,
      " ",
      newEditorState.getCurrentInlineStyle(),
      undefined
    )
    this.onEditorStateChange(
      EditorState.push(newEditorState, contentState, "insert-characters")
    )
  }

  showValidationError = (fieldName: string): ?React$Element<*> => {
    const {
      activeEmail: { validationErrors }
    } = this.props
    const val = validationErrors[fieldName]
    if (val !== undefined) {
      return <span className="validation-error">{val}</span>
    }
  }

  renderDefaultSubheading = (activeEmail: EmailState): React$Element<*> => (
    <div className="subheading-section">
      <h5 className="subheading default">{activeEmail.subheading}</h5>
    </div>
  )

  renderSubheading = (): ?React$Element<*> => {
    const { activeEmail, subheadingRenderer } = this.props
    if (isNilOrBlank(activeEmail.subheading)) {
      return null
    } else {
      const renderFunc = subheadingRenderer || this.renderDefaultSubheading
      return renderFunc(activeEmail)
    }
  }

  setSendAutomaticEmails = (sendAutomaticEmails: boolean): void => {
    const { updateEmailFieldEdit } = this.props
    updateEmailFieldEdit("sendAutomaticEmails", {
      target: {
        value: sendAutomaticEmails
      }
    })
  }

  renderAutomaticEmailSettings = (
    sendAutomaticEmails: boolean
  ): React$Element<*> => (
    <AutomaticEmailOptions
      sendAutomaticEmails={sendAutomaticEmails}
      setSendAutomaticEmails={this.setSendAutomaticEmails}
    />
  )

  onEditorStateChange = (editorState: EditorState) => {
    const { updateEmailBody } = this.props
    this.setState({ editorState }, () => {
      updateEmailBody(editorState)
    })
  }

  clearEditorState = () => {
    this.setState({ editorState: EditorState.createEmpty() })
  }

  closeEmailComposerAndSend = () => {
    const { closeEmailComposerAndSend } = this.props
    closeEmailComposerAndSend().then(this.clearEditorState, () => undefined)
  }

  closeEmailComposeAndClear = () => {
    const { closeAndClearEmailComposer } = this.props
    closeAndClearEmailComposer()
    this.clearEditorState()
  }

  makeCustomToolbarButtons = R.map((variableName: string) => {
    return (
      <RecipientVariableButton
        value={variableName}
        key={variableName}
        onClick={() => this.insertRecipientVariable(`[${variableName}]`)}
      />
    )
  })

  okButtonLabel = (dialogType: string) =>
    dialogType === AUTOMATIC_EMAIL_ADMIN_TYPE ? "Save Changes" : "Send"

  renderRecipientVariable = () => (
    <div className="toolbar-below">
      <div className="insert">Insert:</div>
      {this.makeCustomToolbarButtons(RECIPIENT_VARIABLE_NAMES)}
    </div>
  )

  render() {
    if (!this.props.activeEmail) return null

    const {
      activeEmail: { fetchStatus, inputs, supportsAutomaticEmails, filters },
      title,
      dialogVisibility,
      updateEmailFieldEdit,
      renderRecipients,
      dialogType,
      supportBulkEmails
    } = this.props
    const { editorState } = this.state

    return (
      <Dialog
        classes={{
          paper: "dialog email-composition-dialog",
          root:  "email-composition-dialog-wrapper"
        }}
        open={dialogVisibility}
        onClose={this.closeEmailComposeAndClear}
      >
        <DialogTitle className="dialog-title">
          {title || "New Email"}
        </DialogTitle>
        <DialogContent>
          <div className="email-composition-contents">
            {supportsAutomaticEmails
              ? this.renderAutomaticEmailSettings(
                inputs.sendAutomaticEmails || false
              )
              : null}
            {this.renderSubheading()}
            {renderRecipients ? renderRecipients(filters) : null}
            <textarea
              rows="1"
              className="email-subject"
              placeholder="Subject"
              value={inputs.subject || ""}
              onChange={updateEmailFieldEdit("subject")}
            />
            {this.showValidationError("subject")}
            <Editor
              wrapperClassName="email-body"
              editorState={editorState}
              onEditorStateChange={this.onEditorStateChange}
              toolbar={draftWysiwygToolbar}
            />
            {supportBulkEmails ? this.renderRecipientVariable() : null}
            {this.showValidationError("body")}
          </div>
        </DialogContent>
        <DialogActions>
          {dialogActions(
            this.closeEmailComposeAndClear,
            this.closeEmailComposerAndSend,
            fetchStatus === FETCH_PROCESSING,
            this.okButtonLabel(dialogType)
          )}
        </DialogActions>
      </Dialog>
    )
  }
}
