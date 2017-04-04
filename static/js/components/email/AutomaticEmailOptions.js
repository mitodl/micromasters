// @flow
import React from 'react';
import R from 'ramda';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import {
  ONE_TIME_EMAIL,
  EMAIL_CAMPAIGN
} from './constants';

export default class AutomaticEmailOptions extends React.Component {
  props: {
    sendAutomaticEmails?:  boolean,
    setAutomaticEmailType: (b: boolean) => void,
  };

  handleRadioClick = (event: Event, value: string): void => {
    const { setAutomaticEmailType } = this.props;
    setAutomaticEmailType(R.equals(value, EMAIL_CAMPAIGN) ? true : false);
  }

  renderEmailCampaign = (): React$Element<*> => (
    <div className="email-campaign-content">
      This email will be sent now and in the future whenever users meet the criteria.
    </div>
  );

  getEmailType = (sendAutomaticEmails?: boolean): string => (
    sendAutomaticEmails ? EMAIL_CAMPAIGN : ONE_TIME_EMAIL
  )

  render() {
    const { sendAutomaticEmails } = this.props;

    return (
      <div className="email-type">
        <RadioButtonGroup
          className="type-radio-group"
          name="email-composition-type"
          valueSelected={this.getEmailType(sendAutomaticEmails)}
          onChange={this.handleRadioClick}
        >
          <RadioButton
            value={ONE_TIME_EMAIL}
            label="Send a one-time email"
            className="one-time-email" />
          <RadioButton
            value={EMAIL_CAMPAIGN}
            label="Create an Email Campaign"
            className="email-campaign" />
        </RadioButtonGroup>
        { this.getEmailType(sendAutomaticEmails) === EMAIL_CAMPAIGN ? this.renderEmailCampaign() : null }
      </div>
    );
  }
}
