// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import ReactTooltip from 'react-tooltip';
import _ from 'lodash';

import LANGUAGE_CODES from '../data/language_codes';
import SelectField from './inputs/SelectField';
import CountrySelectField from './inputs/CountrySelectField';
import StateSelectField from './inputs/StateSelectField';
import ProfileFormFields from '../util/ProfileFormFields';
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { Validator, UIValidator } from '../lib/validation/profile';
import type { UIState } from '../reducers/ui';
import type { Option } from '../flow/generalTypes';

export default class PersonalForm extends ProfileFormFields {
  genderOptions: Array<Option> = [
    { value: 'm', label: 'Male' },
    { value: 'f', label: 'Female' },
    { value: 'o', label: 'Other/Prefer not to say' }
  ];
  languageOptions: Array<Option> = _.sortBy(LANGUAGE_CODES.map(language => ({
    value: language.alpha2,
    label: language.English
  })), 'label');

  props: {
    profile:                Profile,
    errors:                 ValidationErrors,
    saveProfile:            SaveProfileFunc,
    updateProfile:          UpdateProfileFunc,
    validator:              Validator|UIValidator,
    ui:                     UIState,
  };

  render() {
    const whyWeAskThis = 'Some program sponsors and employers offer benefits or scholarships ' +
      'to learners with specific backgrounds.';

    return (
      <Grid className="profile-form-grid">
        <Cell col={6}>
          {this.boundTextField(["first_name"], "Given name")}
        </Cell>
        <Cell col={6}>
          {this.boundTextField(["last_name"], "Family name")}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(["preferred_name"], "Nickname / Preferred name")}
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
          <div className="section-header">
            Where are you currently living?
          </div>
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
          <div className="section-header">
            Where are you from? <span
              className="tooltip-link"
              data-tip
              data-for='why-we-ask-this'
              style={{"display": "inline-block"}}
            >(Why we ask this)</span>
            <ReactTooltip id="why-we-ask-this" effect="solid" event="click" globalEventOff="click">
              {whyWeAskThis}
            </ReactTooltip>
          </div>
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            countryKeySet={['birth_country']}
            label='Country of birth'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            countryKeySet={['nationality']}
            label='Nationality'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
      </Grid>
    );
  }
}
