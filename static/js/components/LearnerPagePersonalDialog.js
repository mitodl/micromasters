// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"

import { dialogActions } from "./inputs/util"
import { FETCH_PROCESSING } from "../actions"
import { personalValidation } from "../lib/validation/profile"
import PersonalForm from "./PersonalForm"
import type { Profile, SaveProfileFunc } from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import DialogContent from "@material-ui/core/DialogContent"

export default class LearnerPagePersonalDialog extends React.Component {
  props: {
    setLearnerPageDialogVisibility: () => void,
    ui: UIState,
    profile: Profile,
    profilePatchStatus: ?string,
    saveProfile: SaveProfileFunc,
    clearProfileEdit: () => void
  }

  closePersonalDialog = (): void => {
    const {
      setLearnerPageDialogVisibility,
      clearProfileEdit,
      profile: { username }
    } = this.props
    setLearnerPageDialogVisibility(false)
    clearProfileEdit(username)
  }

  savePersonalInfo = (): void => {
    const { profile, ui, saveProfile } = this.props
    saveProfile(personalValidation, profile, ui).then(() => {
      this.closePersonalDialog()
    })
  }

  render() {
    const {
      ui: { learnerPageDialogVisibility },
      profilePatchStatus
    } = this.props
    const inFlight = profilePatchStatus === FETCH_PROCESSING

    return (
      <Dialog
        classes={{
          paper: "dialog personal-dialog",
          root:  "personal-dialog-wrapper"
        }}
        open={learnerPageDialogVisibility}
        onClose={this.closePersonalDialog}
      >
        <DialogTitle className="dialog-title">Edit Personal Info</DialogTitle>
        <DialogContent dividers>
          <PersonalForm {...this.props} validator={personalValidation} />
        </DialogContent>
        <DialogActions>
          {dialogActions(
            this.closePersonalDialog,
            this.savePersonalInfo,
            inFlight
          )}
        </DialogActions>
      </Dialog>
    )
  }
}
