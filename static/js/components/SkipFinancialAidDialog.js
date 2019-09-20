// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"

import { FETCH_PROCESSING } from "../actions"
import { dialogActions } from "./inputs/util"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import DialogContent from "@material-ui/core/DialogContent"

type SkipProps = {
  cancel: () => void,
  skip: () => Promise<*>,
  open: boolean,
  fullPrice: React$Element<*>,
  fetchAddStatus?: string,
  fetchSkipStatus?: string
}

const SkipFinancialAidDialog = ({
  cancel,
  skip,
  open,
  fullPrice,
  fetchAddStatus,
  fetchSkipStatus
  }: SkipProps) => (
  <Dialog
    classes={{
      paper: "dialog skip-financial-aid-dialog",
      root:  "skip-financial-aid-dialog-wrapper"
    }}
    open={open}
    onClose={cancel}
  >
    <DialogTitle className="dialog-title">Are you sure?</DialogTitle>
    <DialogContent>
      You may qualify for a reduced cost. Clicking "Pay Full Price" means that
      you are declining this option and you will pay the full price of{" "}
      {fullPrice} for each course in the program.
    </DialogContent>
    <DialogActions>
      {dialogActions(
        cancel,
        skip,
        fetchSkipStatus === FETCH_PROCESSING,
        "Pay Full Price",
        "skip-button",
        fetchAddStatus === FETCH_PROCESSING
      )}
    </DialogActions>
  </Dialog>
)

export default SkipFinancialAidDialog
