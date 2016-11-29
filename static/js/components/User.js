// @flow
import React from 'react';

import EmploymentForm from './EmploymentForm';
import EducationForm from './EducationForm';
import UserPagePersonalDialog from './UserPagePersonalDialog.js';
import UserPageAboutMeDialog from './UserPageAboutMeDialog.js';
import UserInfoCard from './UserInfoCard';
import {
  educationValidation,
  employmentValidation,
} from '../lib/validation/profile';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

export default class User extends React.Component {
  props: {
    profile:                      Profile,
    setUserPageDialogVisibility:  () => void,
    ui:                           UIState,
    clearProfileEdit:             () => void,
    saveProfile:                  SaveProfileFunc,
    startProfileEdit:             () => void,
    setUserPageAboutMeDialogVisibility: () => void,
  };

  toggleShowPersonalDialog: Function = (): void => {
    const {
      setUserPageDialogVisibility,
      ui: { userPageDialogVisibility },
      startProfileEdit,
    } = this.props;
    setUserPageDialogVisibility(!userPageDialogVisibility);
    startProfileEdit();
  };

  toggleShowAboutMeDialog: Function = (): void => {
    const {
      setUserPageAboutMeDialogVisibility,
      ui: { userPageAboutMeDialogVisibility },
      startProfileEdit,
    } = this.props;
    setUserPageAboutMeDialogVisibility(!userPageAboutMeDialogVisibility);
    startProfileEdit();
  };

  render() {
    const { profile } = this.props;

    return <div className="single-column">
      <UserPagePersonalDialog {...this.props} />
      <UserPageAboutMeDialog {...this.props} />
      <UserInfoCard
        profile={profile}
        toggleShowAboutMeDialog={this.toggleShowAboutMeDialog}
        toggleShowPersonalDialog={this.toggleShowPersonalDialog} />
      <EducationForm {...this.props} showSwitch={false} validator={educationValidation} />
      <EmploymentForm {...this.props} showSwitch={false} validator={employmentValidation} />
    </div>;
  }
}
