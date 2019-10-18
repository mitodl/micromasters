// @flow
/* global SETTINGS: false */
import Dialog from "@material-ui/core/Dialog"
import React from "react"
import TextField from "@material-ui/core/TextField"
import Grid from "@material-ui/core/Grid"
import R from "ramda"

import { dialogActions } from "../inputs/util"
import { renderFilterOptions } from "../email/lib"

import type { ChannelState, Filter } from "../../flow/discussionTypes"
import type { AvailableProgram } from "../../flow/enrollmentTypes"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import DialogContent from "@material-ui/core/DialogContent"

type ChannelCreateDialogProps = {
  channelDialog: ChannelState,
  isSavingChannel: boolean,
  dialogVisibility: boolean,
  currentProgramEnrollment: ?AvailableProgram,
  closeAndClearDialog: () => void,
  closeAndCreateDialog: () => void,
  updateFieldEdit: () => void
}

export default class ChannelCreateDialog extends React.Component {
  props: ChannelCreateDialogProps

  closeAndClear = (): void => {
    const { closeAndClearDialog } = this.props
    closeAndClearDialog()
  }

  closeAndCreate = (): void => {
    const { closeAndCreateDialog } = this.props
    closeAndCreateDialog()
  }

  showValidationError = (
    fieldName: string,
    ignoreVisibility: boolean = false
  ): ?React$Element<*> => {
    const {
      channelDialog: { validationErrors, validationVisibility }
    } = this.props
    const isVisible = R.propOr(false, fieldName)
    const val = validationErrors[fieldName]
    if (
      (isVisible(validationVisibility) && val !== undefined) ||
      ignoreVisibility
    ) {
      return <span className="validation-error">{val}</span>
    }
  }

  renderChannelFilters(program: AvailableProgram, filters: ?Array<Filter>) {
    if (!filters || R.isEmpty(filters)) {
      return (
        <div className="sk-selected-filters-list">
          <div className="sk-selected-filters-option sk-selected-filters__item">
            <div className="sk-selected-filters-option__name">
              All users in {program.title}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="sk-selected-filters-list">
        {renderFilterOptions(filters)}
      </div>
    )
  }

  render() {
    const {
      channelDialog: { inputs, filters, validationErrors },
      dialogVisibility,
      currentProgramEnrollment,
      updateFieldEdit,
      isSavingChannel
    } = this.props

    if (!currentProgramEnrollment) {
      return null
    }

    return (
      <Dialog
        classes={{
          paper: "dialog create-channel-dialog",
          root:  "create-channel-dialog-wrapper"
        }}
        open={dialogVisibility}
        onClose={this.closeAndClear}
      >
        <DialogTitle className="dialog-title">Create New Channel</DialogTitle>
        <DialogContent className="create-channel-content">
          <Grid container spacing={3} style={{ padding: 20 }}>
            <Grid item xs={12}>
              <p>This channel is for:</p>
              {this.renderChannelFilters(currentProgramEnrollment, filters)}
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Title"
                name="title"
                value={inputs.title || ""}
                onChange={updateFieldEdit("title")}
                fullWidth
              />
              {this.showValidationError("title")}
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Name"
                name="name"
                value={inputs.name || ""}
                onChange={updateFieldEdit("name")}
                helperText='No spaces, e.g., "lectures" or "lectureDiscussion". Once chosen, this cannot be changed.
              This only shows up in the channel URL.'
                fullWidth
              />
              {this.showValidationError("name")}
              <p />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={inputs.description || ""}
                onChange={updateFieldEdit("description")}
                multiline={true}
                fullWidth
              />
              {this.showValidationError("description")}
              {/* 'detail' is the key for a backend permission error */}
              {this.showValidationError("detail", true)}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {dialogActions(
            this.closeAndClear,
            this.closeAndCreate,
            isSavingChannel,
            "Create",
            "",
            !R.isEmpty(validationErrors)
          )}
        </DialogActions>
      </Dialog>
    )
  }
}
