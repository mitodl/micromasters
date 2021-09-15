/* global SETTINGS: false */
import React, { useState, useEffect } from "react"
import Button from "@material-ui/core/Button"
import Dialog from "@material-ui/core/Dialog"
import DialogActions from "@material-ui/core/DialogActions"
import DialogContent from "@material-ui/core/DialogContent"
import DialogTitle from "@material-ui/core/DialogTitle"
import Grid from "@material-ui/core/Grid"
import R from "ramda"

import { COURSEWARE_BACKEND_NAMES } from "../constants"

import type { AvailableProgram } from "../flow/enrollmentTypes"

type Props = {
  currentProgramEnrollment: AvailableProgram
}

const SocialAuthDialog = (props: Props) => {
  const { currentProgramEnrollment } = props
  const [open, setOpen] = useState(false)
  const missingBackend = R.head(
    R.difference(
      R.propOr([], "courseware_backends", currentProgramEnrollment),
      R.propOr([], "social_auth_providers", SETTINGS.user)
    )
  )

  useEffect(() => {
    setOpen(!R.isNil(currentProgramEnrollment) && !R.isNil(missingBackend))
  }, [currentProgramEnrollment, missingBackend])

  if (R.isNil(currentProgramEnrollment)) {
    return null
  }

  return (
    <Dialog
      classes={{
        paper: "dialog"
      }}
      open={open}
      onClose={() => setOpen(false)}
    >
      <DialogTitle className="dialog-title">Action Required</DialogTitle>
      <DialogContent>
        <Grid container style={{ padding: 20 }}>
          <Grid item xs={12}>
            <p>
              Courses for <strong>{currentProgramEnrollment.title}</strong> are
              offered on {COURSEWARE_BACKEND_NAMES[missingBackend]}. Continue to
              create a new account and link it to your current MicroMasters
              account.
            </p>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          key="cancel"
          className="primary-button ok-button"
          href={`/login/${missingBackend}/`}
        >
          Continue to {COURSEWARE_BACKEND_NAMES[missingBackend]}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SocialAuthDialog
