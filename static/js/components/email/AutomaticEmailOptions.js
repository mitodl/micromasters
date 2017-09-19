// @flow
import React from "react"
import { RadioButton, RadioButtonGroup } from "material-ui/RadioButton"

export default class AutomaticEmailOptions extends React.Component {
  props: {
    sendAutomaticEmails?: boolean,
    setSendAutomaticEmails: (b: boolean) => void
  }

  handleRadioClick = (event: Event, value: boolean): void => {
    const { setSendAutomaticEmails } = this.props
    setSendAutomaticEmails(value)
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
        <RadioButtonGroup
          className="type-radio-group"
          name="email-options"
          valueSelected={sendAutomaticEmails}
          onChange={this.handleRadioClick}
        >
          <RadioButton
            value={false}
            label="Send a one-time email"
            className="send-one-time-email"
          />
          <RadioButton
            value={true}
            label="Create an Email Campaign"
            className="create-campaign"
          />
        </RadioButtonGroup>
        {sendAutomaticEmails ? this.renderEmailCampaign() : null}
      </div>
    )
  }
}
