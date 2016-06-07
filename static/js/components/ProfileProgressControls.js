import React from 'react';
import Button from 'react-mdl/lib/Button';

import { saveProfileStep } from '../util/profile_edit';

export default class ProfileProgressControls extends React.Component {
  static propTypes = {
    nextUrl: React.PropTypes.string,
    prevUrl: React.PropTypes.string,
    isLastTab: React.PropTypes.bool,
    saveProfile: React.PropTypes.func.isRequired,
    profile: React.PropTypes.object.isRequired,
    ui: React.PropTypes.object.isRequired,
    validator: React.PropTypes.func.isRequired
  };

  stepBack = () => {
    const { prevUrl } = this.props;
    this.context.router.push(prevUrl);
  };

  saveAndContinue = () => {
    const { nextUrl, isLastTab, validator } = this.props;
    saveProfileStep.call(this, validator, isLastTab).then(() => {
      this.context.router.push(nextUrl);
    });
  };

  render() {
    const { prevUrl, nextUrl, isLastTab } = this.props;

    let prevButton, nextButton;
    if(prevUrl) {
      prevButton = <Button
        raised
        className="progress-button previous"
        onClick={this.stepBack}>
        <span>Previous</span>
      </Button>;
    }
    if(nextUrl) {
      nextButton = <Button
        raised
        colored
        className="progress-button next"
        onClick={this.saveAndContinue}>
        <span>{isLastTab ? "I'm Done!" : "Save and Continue"}</span>
      </Button>;
    }
    return <div>
      {prevButton}
      {nextButton}
    </div>;
  }

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };
}
