// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import SelectField from './inputs/SelectField';
import CountrySelectField from './inputs/CountrySelectField';
import StateSelectField from './inputs/StateSelectField';

import ProfileFormFields from '../util/ProfileFormFields';
import type {
  Profile,
  BoundSaveProfile,
  ValidationErrors
} from '../flow/profileTypes';

export default class PersonalForm extends ProfileFormFields {
  props: {
    profile:        Profile,
    errors:         ValidationErrors,
    saveProfile:    BoundSaveProfile,
    updateProfile:  () => void,
  };

  render() {
    return (
      <Grid className="profile-tab-card-grid">
        <Cell col={6}>
          {this.boundTextField(["first_name"], "Given name")}
        </Cell>
        <Cell col={6}>
          {this.boundTextField(["last_name"], "Family name")}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(["preferred_name"], "Preferred name")}
        </Cell>
        <Cell col={12}>
          {this.boundDateField(['date_of_birth'], 'Date of birth')}
        </Cell>
        <Cell col={12} className="profile-gender-group">
          {this.boundRadioGroupField(['gender'], 'Gender', this.genderOptions)}
        </Cell>
        <Cell col={12}>
          <SelectField
            keySet={['preferred_language']}
            label='Preferred language'
            options={this.languageOptions}
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={12}>
          <h4>Currently Living</h4>
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            stateKeySet={['state_or_territory']}
            countryKeySet={['country']}
            label='Country'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          <StateSelectField
            stateKeySet={['state_or_territory']}
            countryKeySet={['country']}
            label='State or Territory'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          {this.boundTextField(['city'], 'City')}
        </Cell>
        <Cell col={12}>
          <h4>Where were you born?</h4>
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            stateKeySet={['birth_state_or_territory']}
            countryKeySet={['birth_country']}
            label='Country'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          <StateSelectField
            stateKeySet={['birth_state_or_territory']}
            countryKeySet={['birth_country']}
            label='State or Territory'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          {this.boundTextField(['birth_city'], 'City')}
        </Cell>
      </Grid>
    );
  }
}
