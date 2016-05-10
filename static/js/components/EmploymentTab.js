import React from 'react';
import Button from 'react-mdl/lib/Button';
import Grid from 'react-mdl/lib/Grid';
import { Cell } from 'react-mdl/lib/Grid';

import ProfileTab from "../util/ProfileTab";
import { saveAndContinue } from '../util/profile_edit';

class EmploymentTab extends ProfileTab {
  constructor(props) {
    super(props);
    this.saveAndContinue = saveAndContinue.bind(this, '/profile/privacy', EmploymentTab.validation);
    this.blankWorkHistoryEntry = {
      position: "",
      industry: "",
      company_name: "",
      start_date: "",
      end_date: "",
      city: "",
      country: "",
      state_or_territory: '',
    };
  }

  static propTypes = {
    profile:        React.PropTypes.object,
    saveProfile:    React.PropTypes.func,
    updateProfile:  React.PropTypes.func,
  };

  static defaultProps = {
    requiredFields: [],
    validationMessages: {
      'currently_employed': 'Current employment status',
      'position': 'Position',
      'industry': 'Industry',
      'company_name': 'Company Name',
      'start_date': 'Start Date',
      'end_date': 'End Date',
      'city': 'City',
      'country': 'Country',
      'state_or_territory': 'State or Territory',
    },
  };

  static nestedValidationKeys = [
    'position',
    'industry',
    'company_name',
    'start_date',
    'end_date',
    'city',
    'country',
    'state_or_territory',
  ];

  static validation (profile, requiredFields) {
    let nestedFields = (index) => {
      let keySet = (key) => ['work_history', index, key];
      return EmploymentTab.nestedValidationKeys.map(key => keySet(key));
    };

    return requiredFields.concat(
      ...profile.work_history.map( (v,i) => nestedFields(i))
    );
  }

  employmentEntriesForm (index) {
    let keySet = (key) => ['work_history', index, key];
    return (
      <Grid key={index} className="profile-tab-grid">
        <Cell col={12}>
          {this.boundTextField(keySet('company_name'), 'Company Name')}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('position'), 'Position')}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('industry'), 'Industry')}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('city'), 'City')}
        </Cell>
        <Cell col={12}>
          {this.boundStateSelectField(keySet('state_or_territory'), keySet('country'), 'State or Territory')}
        </Cell>
        <Cell col={12}>
          {this.boundSelectField(keySet('country'), 'Country', this.countryOptions)}
        </Cell>
        <Cell col={12}>
          {this.boundMonthYearField(keySet('start_date'), 'Start Date')}
        </Cell>
        <Cell col={12}>
          {this.boundMonthYearField(keySet('end_date'), 'End Date')}
        </Cell>
      </Grid>
    );
  }

  render () {
    return (
      <div>
        {this.editProfileObjectArray(
          'work_history',
          this.blankWorkHistoryEntry,
          this.employmentEntriesForm.bind(this)
        )}
        <Grid className="profile-tab-grid">
          <Cell className="profile-terms" col={6}>
            By clicking Save, you agree to the MIT Micromasters Terms of Service and you agree to
            receiving email from MIT.
          </Cell>
          <Cell col={6}>
            <Button raised onClick={this.saveAndContinue}>
              Save and continue
            </Button>
          </Cell>
        </Grid>
      </div>
    );
  }
}

export default EmploymentTab;
