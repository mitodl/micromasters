import React from 'react';
import _ from 'lodash';

import {
  boundDateField,
  boundTextField,
  boundSelectField,
  boundCountrySelectField,
  boundStateSelectField,
  boundRadioGroupField,
} from './profile_edit';
import { HIGH_SCHOOL, ASSOCIATE, BACHELORS, MASTERS, DOCTORATE } from '../constants';
import LANGUAGE_CODES from '../language_codes';
import INDUSTRIES from '../industries';
import iso3166 from 'iso-3166-2';

export default class ProfileFormFields extends React.Component {
  constructor(props) {
    super(props);

    // bind our field methods to this
    this.boundTextField = boundTextField.bind(this);
    this.boundSelectField = boundSelectField.bind(this);
    this.boundCountrySelectField = boundCountrySelectField.bind(this);
    this.boundStateSelectField = boundStateSelectField.bind(this);
    this.boundDateField = boundDateField.bind(this);
    this.boundRadioGroupField = boundRadioGroupField.bind(this);

    // options we set (for select components)
    let countryOptions = Object.keys(iso3166.data).map(code => ({
      value: code,
      label: iso3166.data[code]['name']
    }));
    this.countryOptions = _.sortBy(countryOptions, 'label');
    this.genderOptions = [
      { value: 'm', label: 'Male' },
      { value: 'f', label: 'Female' },
      { value: 'o', label: 'Other/Prefer not to say' }
    ];
    let languageOptions = LANGUAGE_CODES.map(language => ({
      value: language.alpha2,
      label: language.English
    }));
    this.languageOptions = _.sortBy(languageOptions, 'label');
    this.privacyOptions = [
      { value: 'public', label: 'Public to the world', helper: `We will publish your MicroMaster’s 
        profile on our website.` },
      { value: 'public_to_mm', label: "Public to other MicroMaster’s students", helper: `Your MicroMaster’s profile 
        will only be viewable by other learners in your program, and by MIT faculity and staff.` },
      { value: 'private', label: 'Private', helper: `Your MicroMaster’s profile will be viewable only by 
        MIT faculty and staff.` }
    ];
    this.educationLevelOptions = [
      {value: HIGH_SCHOOL, label: "High school"},
      {value: ASSOCIATE, label: 'Associate degree'},
      {value: BACHELORS, label: "Bachelor's degree"},
      {value: MASTERS, label: "Master's or professional degree"},
      {value: DOCTORATE, label: "Doctorate"}
    ];
    this.industryOptions = INDUSTRIES.map(industry => ({
      value: industry,
      label: industry
    }));
  }

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };
}
