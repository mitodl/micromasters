// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import type { Dispatch } from "redux"

import { showDialog, hideDialog } from "../../actions/ui"
import {
  startChannelEdit,
  clearChannelEdit,
  updateChannelEdit,
  createChannel
} from "../../actions/channels"
import { actions } from "../../lib/redux_rest"
import { discussionErrors } from "../../lib/validation/discussions"
import { getDisplayName } from "../../util/util"
import { CHANNEL_CREATE_DIALOG } from "../../constants"
import ChannelCreateDialog from "./ChannelCreateDialog"

import type { AvailableProgram } from "../../flow/enrollmentTypes"
import type {
  ChannelState,
  CreateChannelResponse
} from "../../flow/discussionTypes"
import type { UIState } from "../../reducers/ui"

const isVisible = R.propOr(false, CHANNEL_CREATE_DIALOG)

export const setDialogVisibility = (visible: boolean) =>
  visible
    ? showDialog(CHANNEL_CREATE_DIALOG)
    : hideDialog(CHANNEL_CREATE_DIALOG)

export const withChannelCreateDialog = (WrappedComponent: ReactClass<*>) => {
  class WithChannelCreateDialog extends React.Component {
    props: {
      channelDialog: ChannelState,
      currentProgramEnrollment: AvailableProgram,
      dispatch: Dispatch,
      ui: UIState
    }

    openChannelCreateDialog = (searchkit: Object): void => {
      const { dispatch } = this.props
      dispatch(
        startChannelEdit({
          filters: searchkit.query.getSelectedFilters(),
          searchkit
        })
      )
      dispatch(setDialogVisibility(true))
    }

    closeAndClearDialog = (): void => {
      const { dispatch } = this.props
      dispatch(clearChannelEdit())
      dispatch(setDialogVisibility(false))
    }

    closeAndCreateDialog = (): void => {
      const {
        dispatch,
        channelDialog: { inputs, searchkit },
        currentProgramEnrollment
      } = this.props
      const query = searchkit.buildQuery().query
      if (R.isEmpty(discussionErrors(inputs))) {
        dispatch(
          createChannel((...args) => dispatch(actions.channels.post(...args)), [
            {
              ...inputs,
              query,
              program_id: currentProgramEnrollment.id
            }
          ])
        ).then((channel: CreateChannelResponse) => {
          this.closeAndClearDialog()

          if (SETTINGS.open_discussions_redirect_url) {
            const channelUrl = `${SETTINGS.open_discussions_redirect_url}channel/${channel.name}`
            window.open(channelUrl, "_self")
          }
        })
      }
    }

    updateChannelChanges = (fieldName: string, value: any) => {
      const { dispatch } = this.props
      dispatch(
        updateChannelEdit({
          inputs: {
            [fieldName]: value
          },
          validationVisibility: {
            [fieldName]: true
          }
        })
      )
    }

    updateEmailFieldEdit = R.curry((fieldName, e): void => {
      this.updateChannelChanges(fieldName, e.target.value)
    })

    render() {
      const {
        ui: { dialogVisibility },
        channelDialog,
        currentProgramEnrollment
      } = this.props
      return (
        <div>
          <WrappedComponent
            {...this.props}
            openChannelCreateDialog={this.openChannelCreateDialog}
          />
          <ChannelCreateDialog
            updateEmailFieldEdit={this.updateEmailFieldEdit}
            dialogVisibility={isVisible(dialogVisibility)}
            closeAndClearDialog={this.closeAndClearDialog}
            closeAndCreateDialog={this.closeAndCreateDialog}
            currentProgramEnrollment={currentProgramEnrollment}
            channelDialog={channelDialog}
          />
        </div>
      )
    }
  }

  WithChannelCreateDialog.displayName = `WithChannelCreateDialog(${getDisplayName(
    WrappedComponent
  )})`
  return WithChannelCreateDialog
}
