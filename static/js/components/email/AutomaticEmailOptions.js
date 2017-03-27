// @flow
import React from 'react';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import {
  ONE_TIME_EMAIL,
  EMAIL_CAMPAIGN
} from './constants';

export default class EmailCompositionType extends React.Component {
  props: {
    automaticEmailType:    ?string,
    setAutomaticEmailType: (b: string) => void,
  };

  handleRadioClick = (event: Event, value: string): void => {
    const { setAutomaticEmailType } = this.props;
    setAutomaticEmailType(value);
  }

  renderEmailCampaign = (): React$Element<*> => (
    <div className="email-campaign-content">
      This email will be sent now and in the future whenever users meet the criteria.
    </div>
  );

  render() {
    const { automaticEmailType } = this.props;

    return (
      <div className="email-type">
        <RadioButtonGroup
          className="type-radio-group"
          name="email-composition-type"
          valueSelected={automaticEmailType}
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
        { automaticEmailType === EMAIL_CAMPAIGN ? this.renderEmailCampaign() : null }
      </div>
    );
  }
}
