// @flow
import React from "react"
import PropTypes from "prop-types"
import Dialog from "@material-ui/core/Dialog"
import Button from "@material-ui/core/Button"

import { singleBtnDialogActions } from "../inputs/util"
import DialogActions from "@material-ui/core/DialogActions"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"

export default class PersonalCoursePriceDialog extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  props: {
    open: boolean,
    setVisibility: (v: boolean) => void,
    openFinancialAidCalculator: () => void
  }

  handleCalculateClick = () => {
    const { setVisibility, openFinancialAidCalculator } = this.props
    setVisibility(false)
    openFinancialAidCalculator()
  }

  render() {
    const { open, setVisibility } = this.props

    const calculateButton = (
      <Button
        key="ask-to-calculate"
        onClick={this.handleCalculateClick}
        className="primary-button save-button calculate-button"
      >
        Calculate Price
      </Button>
    )
    return (
      <Dialog
        classes={{
          paper: "dialog calculate-price-dialog",
          root:  "calculate-dialog-wrapper"
        }}
        open={open}
        onClose={() => setVisibility(false)}
      >
        <DialogTitle className="dialog-title">
          Calculate Personal Course Price?
        </DialogTitle>
        <DialogContent>
          You need to calculate your course price before you can pay for this
          course. (Payment is required to get credit for the MicroMasters
          certificate.)
        </DialogContent>
        <DialogActions>
          {[
            singleBtnDialogActions(() => setVisibility(false), "cancel"),
            calculateButton
          ]}
        </DialogActions>
      </Dialog>
    )
  }
}
