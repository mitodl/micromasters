// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card, CardMenu } from 'react-mdl/lib/Card';
import IconButton from 'react-mdl/lib/IconButton';
import iso3166 from 'iso-3166-2';

import ProfileImage from './ProfileImage';
import EmploymentForm from './EmploymentForm';
import EducationDisplay from './EducationDisplay';
import UserPagePersonalDialog from './UserPagePersonalDialog.js';
import UserInfoCard from './UserInfoCard';
import { userPrivilegeCheck } from '../util/util';
import { employmentValidation } from '../util/validation';
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

    let getStateName = () => {
      if ( profile.state_or_territory ) {
        return iso3166.subdivision(profile.state_or_territory).name;
      } else {
        return '';
      }
    };

    return <div>
      <UserPagePersonalDialog {...this.props} />
      <div className="card-copy">
        <UserInfoCard profile={profile} />
        <EmploymentForm {...this.props} showSwitch={false} validator={employmentValidation} />
        <EducationDisplay {...this.props} />
      </div>
    </div>;
  }
}
