// @flow
import React from "react"
import Radio from "@material-ui/core/Radio"
import RadioGroup from "@material-ui/core/RadioGroup"
import FormControlLabel from "@material-ui/core/FormControlLabel"
import FormControl from "@material-ui/core/FormControl"
import PropTypes from "prop-types"

// Fix value prop type. This is a string but the docs say any type can be passed in
// and the value will be cast to a string at the DOM layer.
// https://material-ui.com/api/radio-group/
if (RadioGroup.propTypes) {
  // check that RadioGroup.propTypes exists. It won't exist in production
  RadioGroup.propTypes.value = PropTypes.any
}

export default class AutomaticEmailOptions extends React.Component {
  props: {
    sendAutomaticEmails?: boolean,
    setSendAutomaticEmails: (b: boolean) => void
  }

  handleRadioClick = (event: any): void => {
    const { setSendAutomaticEmails } = this.props
    setSendAutomaticEmails(event.target.value === "true")
  }

  renderEmailCampaign = (): React$Element<*> => (
    <div className="email-campaign-content">
      This email will be sent now and in the future whenever users meet the
      criteria.
    </div>
  )

  render() {
    const { sendAutomaticEmails } = this.props

    return (
      <div className="email-type">
        <FormControl>
          <RadioGroup
            className="type-radio-group"
            name="email-options"
            value={sendAutomaticEmails}
            onChange={this.handleRadioClick}
          >
            <FormControlLabel
              value={false}
              control={<Radio />}
              label="Send a one-time email"
              className="send-one-time-email"
            />

            <FormControlLabel
              value={true}
              control={<Radio />}
              label="Create an Email Campaign"
              className="create-campaign"
            />
          </RadioGroup>
        </FormControl>
        {sendAutomaticEmails ? this.renderEmailCampaign() : null}
      </div>
    )
  }
}
