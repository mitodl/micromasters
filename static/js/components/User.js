// @flow
import React from 'react';

import EmploymentForm from './EmploymentForm';
import EducationForm from './EducationForm';
import UserPagePersonalDialog from './UserPagePersonalDialog.js';
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
  };

  toggleShowPersonalDialog: Function = (): void => {
    const {
      setUserPageDialogVisibility,
      ui: { userPageDialogVisibility }
    } = this.props;
    setUserPageDialogVisibility(!userPageDialogVisibility);
  };

  render() {
    const { profile } = this.props;

    return <div className="single-column">
      <UserPagePersonalDialog {...this.props} />
      <UserInfoCard profile={profile} toggleShowPersonalDialog={this.toggleShowPersonalDialog} />
      <EducationForm {...this.props} showSwitch={false} validator={educationValidation} />
      <EmploymentForm {...this.props} showSwitch={false} validator={employmentValidation} />
    </div>;
  }
}
