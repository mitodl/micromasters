// @flow
/* global SETTINGS: false */
import React from 'react';
import R from 'ramda';

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
import StaffLearnerInfoCard from './StaffLearnerInfoCard';
import type { DashboardState } from '../flow/dashboardTypes';

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
    dashboard:                              DashboardState,
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

  showStaffInfo = () => {
    const { dashboard } = this.props;
    if (! R.isEmpty(dashboard)) {
      return dashboard.programs.map(program => (
        <StaffLearnerInfoCard
          program={program}
          key={program.title}
        />
      ));
    }
    return null;
  };

  render() {
    const { profile } = this.props;

    return <div className="single-column dashboard">
      <LearnerPagePersonalDialog {...this.props} />
      <LearnerPageAboutMeDialog {...this.props} validator={personalValidation} />
      <LearnerInfoCard
        profile={profile}
        toggleShowAboutMeDialog={this.toggleShowAboutMeDialog}
        toggleShowPersonalDialog={this.toggleShowPersonalDialog} />
      { this.showStaffInfo() }
      <EducationForm {...this.props} showSwitch={false} validator={educationValidation} />
      <EmploymentForm {...this.props} showSwitch={false} validator={employmentValidation} />
    </div>;
  }
}
