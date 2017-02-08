// @flow
import React from 'react';

import EmploymentForm from './EmploymentForm';
import EducationForm from './EducationForm';
import LearnerPagePersonalDialog from './LearnerPagePersonalDialog.js';
import LearnerPageAboutMeDialog from './LearnerPageAboutMeDialog.js';
import LearnerInfoCard from './LearnerInfoCard';
import {
  educationValidation,
  employmentValidation,
  personalValidation,
} from '../lib/validation/profile';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

export default class Learner extends React.Component {
  props: {
    profile:                                Profile,
    profilePatchStatus:                     ?string,
    setLearnerPageDialogVisibility:         () => void,
    ui:                                     UIState,
    clearProfileEdit:                       () => void,
    saveProfile:                            SaveProfileFunc,
    startProfileEdit:                       () => void,
    setLearnerPageAboutMeDialogVisibility:  () => void,
  };

  toggleShowPersonalDialog = (): void => {
    const {
      setLearnerPageDialogVisibility,
      ui: { learnerPageDialogVisibility },
      startProfileEdit,
    } = this.props;
    setLearnerPageDialogVisibility(!learnerPageDialogVisibility);
    startProfileEdit();
  };

  toggleShowAboutMeDialog = (): void => {
    const {
      setLearnerPageAboutMeDialogVisibility,
      ui: { learnerPageAboutMeDialogVisibility },
      startProfileEdit,
    } = this.props;
    setLearnerPageAboutMeDialogVisibility(!learnerPageAboutMeDialogVisibility);
    startProfileEdit();
  };

  render() {
    const { profile } = this.props;

    return <div className="single-column">
      <LearnerPagePersonalDialog {...this.props} />
      <LearnerPageAboutMeDialog {...this.props} validator={personalValidation} />
      <LearnerInfoCard
        profile={profile}
        toggleShowAboutMeDialog={this.toggleShowAboutMeDialog}
        toggleShowPersonalDialog={this.toggleShowPersonalDialog} />
      <EducationForm {...this.props} showSwitch={false} validator={educationValidation} />
      <EmploymentForm {...this.props} showSwitch={false} validator={employmentValidation} />
    </div>;
  }
}
