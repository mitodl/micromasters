// @flow
import React from "react"
import Dialog from "material-ui/Dialog"

import { FETCH_PROCESSING } from "../actions"
import { dialogActions } from "./inputs/util"

type SkipProps = {
  cancel: () => void,
  skip: () => void,
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
    title="Are you sure?"
    titleClassName="dialog-title"
    contentClassName="dialog skip-financial-aid-dialog"
    className="skip-financial-aid-dialog-wrapper"
    open={open}
    onRequestClose={cancel}
    actions={dialogActions(
      cancel,
      skip,
      fetchSkipStatus === FETCH_PROCESSING,
      "Pay Full Price",
      "skip-button",
      fetchAddStatus === FETCH_PROCESSING
    )}
  >
    You may qualify for a reduced cost. Clicking "Pay Full Price" means that you
    are declining this option and you will pay the full price of {fullPrice} for
    each course in the program.
  </Dialog>
)

export default SkipFinancialAidDialog
