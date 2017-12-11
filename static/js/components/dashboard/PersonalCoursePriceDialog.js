// @flow
import React from "react"
import PropTypes from "prop-types"
import Dialog from "material-ui/Dialog"
import Button from "react-mdl/lib/Button"

import { singleBtnDialogActions } from "../inputs/util"

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
        title="Calculate Personal Course Price?"
        titleClassName="dialog-title"
        contentClassName="dialog calculate-price-dialog"
        className="calculate-dialog-wrapper"
        open={open}
        onRequestClose={() => setVisibility(false)}
        actions={[
          singleBtnDialogActions(() => setVisibility(false), "cancel"),
          calculateButton
        ]}
      >
        You need to calculate your course price before you can pay for this
        course. (Payment is required to get credit for the MicroMasters
        certificate.)
      </Dialog>
    )
  }
}
