import React from 'react';

import {
  boundDateField,
  boundTextField,
  boundSelectField,
  boundMonthYearField,
  editProfileObjectArray,
  boundStateSelectField,
} from './profile_edit';
import { HIGH_SCHOOL, ASSOCIATE, BACHELORS, MASTERS, DOCTORATE } from '../constants';
import LANGUAGE_CODES from '../language_codes';
import iso3166 from 'iso-3166-2';
import _ from 'lodash';


class ProfileTab extends React.Component {
  constructor(props) {
    super(props);

    // bind our field methods to this
    this.boundTextField = boundTextField.bind(this);
    this.boundSelectField = boundSelectField.bind(this);
    this.boundStateSelectField = boundStateSelectField.bind(this);
    this.boundDateField = boundDateField.bind(this);
    this.boundMonthYearField = boundMonthYearField.bind(this);
    this.editProfileObjectArray = editProfileObjectArray.bind(this);
    this.boundMonthYearField = boundMonthYearField.bind(this);

    // options we set (for select components)
    let countryOptions = Object.keys(iso3166.data).map(code => ({
      value: code,
      label: iso3166.data[code]['name']
    }));
    this.countryOptions = _.sortBy(countryOptions, 'label');
    this.boolOptions = [
      { value: 'y', label: 'Yes' },
      { value: 'n', label: 'No' }
    ];
    this.genderOptions = [
      { value: 'm', label: 'Male' },
      { value: 'f', label: 'Female' },
      { value: 'o', label: 'Other/Prefer not to say' }
    ];
    this.languageOptions = LANGUAGE_CODES.map(language => ({
      value: language.alpha2,
      label: language.English
    }));
    this.privacyOptions = [
      { value: 'public', label: 'Public to the world'},
      { value: 'public_to_mm', label: 'Public to other micromasters students'},
      { value: 'private', label: 'Private'}
    ];
    this.educationLevelOptions = [
      {value: HIGH_SCHOOL, label: "High school"},
      {value: ASSOCIATE, label: 'Associate degree'},
      {value: BACHELORS, label: "Bachelor's degree"},
      {value: MASTERS, label: "Master's or professional degree"},
      {value: DOCTORATE, label: "Doctorate"}
    ];
  }

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };
}

export default ProfileTab;
