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
import StaffLearnerInfoCard from './StaffLearnerInfoCard';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { CoursePrices, DashboardState } from '../flow/dashboardTypes';
import type { RestState } from '../flow/restTypes';
import type { CouponsState } from '../reducers/coupons';
import { calculatePrices } from '../lib/coupon';

export default class Learner extends React.Component {
  props: {
    profile:                                Profile,
    profilePatchStatus:                     ?string,
    ui:                                     UIState,
    dashboard:                              DashboardState,
    saveProfile:                            SaveProfileFunc,
    clearProfileEdit:                       () => void,
    setLearnerPageDialogVisibility:         () => void,
    startProfileEdit:                       () => void,
    setLearnerPageAboutMeDialogVisibility:  () => void,
    openLearnerEmailComposer:               () => void,
    setShowGradeDetailDialog:               (b: boolean, t:string) => void,
    prices:                                 RestState<CoursePrices>,
    coupons:                                CouponsState,
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
    const {
      dashboard,
      ui,
      setShowGradeDetailDialog,
      coupons,
      prices,
    } = this.props;

    if (!R.isEmpty(dashboard) && coupons && !R.isEmpty(prices)) {
      let calculatedPrices = calculatePrices(dashboard.programs, prices.data || [], coupons.coupons);
      return dashboard.programs.map(program => (
        <StaffLearnerInfoCard
          prices={calculatedPrices}
          program={program}
          key={program.title}
          setShowGradeDetailDialog={setShowGradeDetailDialog}
          dialogVisibility={ui.dialogVisibility}
        />
      ));
    }
    return null;
  };

  render() {
    const {
      profile,
      openLearnerEmailComposer
    } = this.props;

    return <div className="single-column dashboard">
      <LearnerPagePersonalDialog {...this.props} />
      <LearnerPageAboutMeDialog {...this.props} validator={personalValidation} />
      <LearnerInfoCard
        profile={profile}
        toggleShowAboutMeDialog={this.toggleShowAboutMeDialog}
        toggleShowPersonalDialog={this.toggleShowPersonalDialog}
        openLearnerEmailComposer={openLearnerEmailComposer} />
      { this.showStaffInfo() }
      <EducationForm {...this.props} showSwitch={false} validator={educationValidation} />
      <EmploymentForm {...this.props} showSwitch={false} validator={employmentValidation} />
    </div>;
  }
}
