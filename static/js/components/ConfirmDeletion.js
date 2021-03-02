// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"

import { dialogActions } from "./inputs/util"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"

const dialogTitle = (item = "entry") => `Delete this ${item}?`

// eslint-disable-next-line require-jsdoc
export default class ConfirmDeletion extends React.Component {
  props: {
    close: () => void,
    deleteFunc: () => Promise<*>,
    open: boolean,
    inFlight: boolean,
    itemText: string
  }

  deleteAndClose = (): void => {
    // eslint-disable-next-line no-invalid-this
    const { close, deleteFunc } = this.props
    deleteFunc().then(close)
  }

  // eslint-disable-next-line require-jsdoc
  render() {
    const { close, open, inFlight, itemText } = this.props
    return (
      <Dialog
        classes={{
          root:  "deletion-confirmation-dialog-wrapper",
          paper: "dialog deletion-confirmation-dialog"
        }}
        open={open}
        onClose={close}
      >
        <DialogTitle className="dialog-title">
          {dialogTitle(itemText)}
        </DialogTitle>
        <DialogActions>
          {dialogActions(
            close,
            this.deleteAndClose,
            inFlight,
            "Delete",
            "delete-button"
          )}
        </DialogActions>
      </Dialog>
    )
  }
}
