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
  updateChannelErrors
} from "../../actions/channels"
import { actions } from "../../lib/redux_rest"
import { discussionErrors } from "../../lib/validation/discussions"
import { getDisplayName } from "../../util/util"
import { CHANNEL_CREATE_DIALOG } from "../../constants"
import ChannelCreateDialog from "./ChannelCreateDialog"

import type { AvailableProgram } from "../../flow/enrollmentTypes"
import type { ChannelInputs, ChannelState } from "../../flow/discussionTypes"
import type { UIState } from "../../reducers/ui"
import type { RestState } from "../../flow/restTypes"
import { channelURL } from "../../lib/discussions"

const isVisible = R.propOr(false, CHANNEL_CREATE_DIALOG)

export const setDialogVisibility = (visible: boolean) =>
  visible
    ? showDialog(CHANNEL_CREATE_DIALOG)
    : hideDialog(CHANNEL_CREATE_DIALOG)

export const withChannelCreateDialog = (WrappedComponent: ReactClass<*>) => {
  class WithChannelCreateDialog extends React.Component {
    props: {
      channelDialog: ChannelState,
      channels: RestState<any>,
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
      const errors = discussionErrors(inputs)
      if (R.isEmpty(errors)) {
        this.createChannel(inputs, query, currentProgramEnrollment)
      } else {
        dispatch(updateChannelErrors(errors))
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

    createChannel = async (
      inputs: ChannelInputs,
      query: Object,
      programEnrollment: AvailableProgram
    ) => {
      const { dispatch } = this.props
      try {
        const channel = await dispatch(
          actions.channels.post({
            ...inputs,
            query,
            program_id: programEnrollment.id
          })
        )

        this.closeAndClearDialog()

        if (SETTINGS.open_discussions_base_url) {
          window.open(channelURL(channel.name), "_self")
        }
      } catch (remoteErrors) {
        dispatch(updateChannelErrors(remoteErrors))
      }
    }

    updateFieldEdit = R.curry((fieldName, e): void => {
      this.updateChannelChanges(fieldName, e.target.value)
    })

    render() {
      const {
        ui: { dialogVisibility },
        channelDialog,
        channels,
        currentProgramEnrollment
      } = this.props
      return (
        <div>
          <WrappedComponent
            {...this.props}
            openChannelCreateDialog={this.openChannelCreateDialog}
          />
          <ChannelCreateDialog
            updateFieldEdit={this.updateFieldEdit}
            dialogVisibility={isVisible(dialogVisibility)}
            closeAndClearDialog={this.closeAndClearDialog}
            closeAndCreateDialog={this.closeAndCreateDialog}
            currentProgramEnrollment={currentProgramEnrollment}
            channelDialog={channelDialog}
            isSavingChannel={channels.processing}
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
