// @flow
import React from "react"
import _ from "lodash"
import iso3166 from "iso-3166-2"
import R from "ramda"

import SelectField from "./SelectField"
import type {
  Profile,
  UpdateProfileFunc,
  ValidationErrors
} from "../../flow/profileTypes"
import type { Validator, UIValidator } from "../../lib/validation/profile"
import type { Option } from "../../flow/generalTypes"
import { labelSort } from "../../util/util"

// VI is US Virgin Islands, VG is British
const adjustVIEntries = R.compose(
  R.set(R.lensProp("VI"), "US Virgin Islands"),
  R.set(R.lensProp("VG"), "British Virgin Islands")
)

const countryOption = (name, code) => ({ value: code, label: name })

const makeCountryOptions = R.compose(
  labelSort,
  R.values,
  R.mapObjIndexed(countryOption),
  adjustVIEntries,
  R.map(R.prop("name"))
)

const countryOptions = makeCountryOptions(iso3166.data)

export default class CountrySelectField extends React.Component {
  props: {
    className: string,
    countryKeySet: Array<string>,
    errors: ValidationErrors,
    keySet: Array<string>,
    label: string,
    maxSearchResults: number,
    options: Array<Option>,
    profile: Profile,
    stateKeySet: Array<string>,
    topMenu: boolean,
    updateProfile: UpdateProfileFunc,
    updateValidationVisibility: (xs: Array<string>) => void,
    validator: Validator | UIValidator
  }

  onChange = (selection: Option): void => {
    const {
      stateKeySet,
      countryKeySet,
      updateProfile,
      validator,
      profile
    } = this.props
    // clear state field when country field changes
    let clone = _.cloneDeep(profile)
    _.set(clone, stateKeySet, null)
    _.set(clone, countryKeySet, selection ? selection.value : "")
    updateProfile(clone, validator)
  }

  render() {
    const { countryKeySet } = this.props
    return (
      <SelectField
        options={countryOptions}
        keySet={countryKeySet}
        onChange={this.onChange}
        {...this.props}
      />
    )
  }
}
