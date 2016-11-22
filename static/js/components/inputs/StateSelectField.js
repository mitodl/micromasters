// @flow
import React from 'react';
import _ from 'lodash';
import iso3166 from 'iso-3166-2';
import R from 'ramda';

import SelectField from './SelectField';
import { labelSort } from '../../util/util';
import type { Validator, UIValidator } from '../../lib/validation/profile';
import type {
  Profile,
  ValidationErrors,
  UpdateProfileFunc,
} from '../../flow/profileTypes';

const stateOption = (stateInfo, code) => (
  { value: code, label: stateInfo.name }
);

const statesForCountry = code => R.propOr({}, 'sub', R.defaultTo({}, iso3166.data[code]));

const stateOptions = R.compose(
  labelSort, R.values, R.mapObjIndexed(stateOption), statesForCountry
);

type StateSelectProps = {
  className:                  string,
  countryKeySet:              Array<string>,
  errors:                     ValidationErrors,
  label:                      string,
  onChange:                   Function,
  profile:                    Profile,
  stateKeySet:                Array<string>,
  topMenu:                    boolean,
  updateProfile:              UpdateProfileFunc,
  updateValidationVisibility: (xs: Array<string>) => void,
  validator:                  Validator|UIValidator,
};

export default (props: StateSelectProps) => {
  const { stateKeySet, countryKeySet, profile } = props;
  let country = _.get(profile, countryKeySet);
  return <SelectField
    {...props}
    options={stateOptions(country)}
    keySet={stateKeySet}
  />;
};
