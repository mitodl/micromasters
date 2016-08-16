// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card, CardTitle, CardText } from 'react-mdl/lib/Card';
import Link from 'react-router/lib/Link';

import ProfileImage from './ProfileImage';
import { getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';
import type { Program } from '../flow/programTypes';

export default class UserInfoCard extends React.Component {
  props: {
    profile: Profile
  };

  getCurrentWorkPlace: Function = (profile: Profile): string => {
    let company_name = "";
    for (let work_history of profile.work_history) {
      if (work_history.end_date === null) {
        company_name = work_history.company_name;
        break;
      }
    }
    return company_name;
  }

  render() {
    const { profile } = this.props;

    return (
      <div className="profile-form profile-form-center-card profile-form-center-card-transparent">
        <Grid className="profile-form-grid profile-form-grid-transparent">
          <Cell col={3}>
            <ProfileImage profile={profile} editable={true} />
          </Cell>
          <Cell col={9}>
            <div className="profile-title">{getPreferredName(profile)}</div>
            <div className="profile-company-name">{this.getCurrentWorkPlace(profile)}</div>
            <div className="profile-email">
              <img src='/static/images/email.png' alt="Email image" className="email-icon"/>
              {profile.email}
            </div>
          </Cell>
        </Grid>
      </div>
    );
  }
}
