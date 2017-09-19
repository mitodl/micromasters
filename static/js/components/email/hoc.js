// @flow
import React from "react"
import R from "ramda"

import EmailCompositionDialog from "./EmailCompositionDialog"
import { getDisplayName, isNilOrBlank } from "../../util/util"
import { showDialog, hideDialog } from "../../actions/ui"
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  sendEmail
} from "../../actions/email"
import { emailValidation } from "../../lib/validation/profile"
import { EMAIL_COMPOSITION_DIALOG } from "./constants"
import type { EmailState, EmailConfig } from "../../flow/emailTypes"
import { stateToHTML } from "draft-js-export-html"
import type { EditorState } from "../../flow/draftJSTypes"

export const withEmailDialog = R.curry(
  (emailConfigs: { [key: string]: EmailConfig }, WrappedComponent) => {
    class WithEmailDialog extends React.Component {
      getActiveEmailType(): ?string {
        const { email } = this.props
        return !isNilOrBlank(email.currentlyActive)
          ? email.currentlyActive
          : undefined
      }

      getActiveEmailState(): EmailState {
        const { email } = this.props
        return email[email.currentlyActive]
      }

      openEmailComposer = R.curry(
        (emailType: string, emailOpenParams: any): void => {
          const { dispatch } = this.props
          dispatch(
            startEmailEdit({
              type: emailType,
              ...emailConfigs[emailType].emailOpenParams(emailOpenParams)
            })
          )
          dispatch(showDialog(EMAIL_COMPOSITION_DIALOG))
        }
      )

      saveEmailChanges = (fieldName, value) => {
        const { dispatch, email: { currentlyActive } } = this.props
        let activeEmail = this.getActiveEmailState()
        let inputsClone = R.clone(activeEmail.inputs)
        inputsClone[fieldName] = value
        dispatch(
          updateEmailEdit({ type: currentlyActive, inputs: inputsClone })
        )
        if (!R.isEmpty(activeEmail.validationErrors)) {
          let cloneErrors = emailValidation(inputsClone)
          dispatch(
            updateEmailValidation({
              type:   currentlyActive,
              errors: cloneErrors
            })
          )
        }
      }

      updateEmailFieldEdit = R.curry((fieldName, e): void => {
        this.saveEmailChanges(fieldName, e.target.value)
      })

      updateEmailBody = (editorState: EditorState): void => {
        this.saveEmailChanges(
          "body",
          stateToHTML(editorState.getCurrentContent())
        )
      }

      closeAndClearEmailComposer = (): void => {
        const { dispatch, email: { currentlyActive } } = this.props
        dispatch(clearEmailEdit(currentlyActive))
        dispatch(hideDialog(EMAIL_COMPOSITION_DIALOG))
      }

      closeEmailComposerAndSend = (): Promise<void> => {
        const { dispatch, email: { currentlyActive } } = this.props
        let activeEmail = this.getActiveEmailState()
        let errors = emailValidation(activeEmail.inputs)
        dispatch(
          updateEmailValidation({ type: currentlyActive, errors: errors })
        )
        return new Promise((resolve, reject) => {
          if (R.isEmpty(errors)) {
            resolve()
          } else {
            reject()
          }
        }).then(() => {
          if (emailConfigs[currentlyActive].editEmail) {
            return dispatch(
              emailConfigs[currentlyActive].editEmail(
                emailConfigs[currentlyActive].emailSendParams(activeEmail)
              )
            ).then(this.closeAndClearEmailComposer)
          } else {
            return dispatch(
              sendEmail(
                currentlyActive,
                emailConfigs[currentlyActive].getEmailSendFunction(),
                emailConfigs[currentlyActive].emailSendParams(activeEmail)
              )
            ).then(this.closeAndClearEmailComposer())
          }
        })
      }

      renderCompositionDialog(): ?React$Element<*> {
        let { ui: { dialogVisibility } } = this.props

        let activeEmailType = this.getActiveEmailType()

        if (!activeEmailType) return null

        const emailConfig = emailConfigs[activeEmailType] || {}
        return (
          <EmailCompositionDialog
            updateEmailFieldEdit={this.updateEmailFieldEdit}
            closeAndClearEmailComposer={this.closeAndClearEmailComposer}
            closeEmailComposerAndSend={this.closeEmailComposerAndSend}
            dialogVisibility={dialogVisibility[EMAIL_COMPOSITION_DIALOG]}
            activeEmail={this.getActiveEmailState()}
            title={emailConfig.title}
            subheadingRenderer={emailConfig.renderSubheading}
            renderRecipients={emailConfig.renderRecipients}
            updateEmailBody={this.updateEmailBody}
            dialogType={activeEmailType}
          />
        )
      }

      render() {
        return (
          <div>
            <WrappedComponent
              {...this.props}
              openEmailComposer={this.openEmailComposer}
            />
            {this.renderCompositionDialog()}
          </div>
        )
      }
    }

    WithEmailDialog.displayName = `WithEmailDialogs(${getDisplayName(
      WrappedComponent
    )})`
    return WithEmailDialog
  }
)
