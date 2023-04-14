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

type Props = {
  invalidBackendCredentials: string[]
}

const SocialAuthReauthenticateDialog = (props: Props) => {
  const { invalidBackendCredentials } = props
  const [open, setOpen] = useState(false)
  const invalidCredential = R.head(invalidBackendCredentials)

  useEffect(() => {
    setOpen(!R.isNil(invalidCredential))
  }, [invalidCredential])

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
              Your account is linked to{" "}
              {COURSEWARE_BACKEND_NAMES[invalidCredential]}, but this link is no
              longer active. Continue to log in with your account and relink it
              to your current MicroMasters account.
            </p>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          key="cancel"
          className="primary-button ok-button"
          href={`/login/${invalidCredential}/`}
        >
          Continue to {COURSEWARE_BACKEND_NAMES[invalidCredential]}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SocialAuthReauthenticateDialog
