// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import DialogActions from "@material-ui/core/DialogActions"

import { FETCH_PROCESSING } from "../actions"
import ProfileFormFields from "../util/ProfileFormFields"
import { dialogActions } from "./inputs/util"
import type { Profile, SaveProfileFunc } from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import type { Validator } from "../lib/validation/profile"

export default class LearnerPageAboutMeDialog extends ProfileFormFields {
  props: {
    ui: UIState,
    profile: Profile,
    profilePatchStatus: ?string,
    saveProfile: SaveProfileFunc,
    clearProfileEdit: () => void,
    setLearnerPageAboutMeDialogVisibility: () => void,
    validator: Validator
  }

  closeAboutMeDialog = (): void => {
    const {
      setLearnerPageAboutMeDialogVisibility,
      clearProfileEdit,
      profile: { username }
    } = this.props
    setLearnerPageAboutMeDialogVisibility(false)
    clearProfileEdit(username)
  }

  saveAboutMeInfo = (): void => {
    const { profile, ui, saveProfile, validator } = this.props
    saveProfile(validator, profile, ui).then(() => {
      this.closeAboutMeDialog()
    })
  }

  render() {
    const {
      ui: { learnerPageAboutMeDialogVisibility },
      profilePatchStatus
    } = this.props
    const inFlight = profilePatchStatus === FETCH_PROCESSING

    return (
      <Dialog
        classes={{
          paper: "dialog about-me-dialog",
          root:  "about-me-dialog-wrapper"
        }}
        open={learnerPageAboutMeDialogVisibility}
        onClose={this.closeAboutMeDialog}
      >
        <DialogTitle className="dialog-title">About Me</DialogTitle>
        <DialogContent>
          {this.boundTextField(["about_me"], "Introduce yourself", {
            multiLine: true
          })}
        </DialogContent>
        <DialogActions>
          {dialogActions(
            this.closeAboutMeDialog,
            this.saveAboutMeInfo,
            inFlight
          )}
        </DialogActions>
      </Dialog>
    )
  }
}
