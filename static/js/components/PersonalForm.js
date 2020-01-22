// @flow
import React from "react"
import Grid from "@material-ui/core/Grid"
import ReactTooltip from "react-tooltip"
import _ from "lodash"

import LANGUAGE_CODES from "../data/language_codes"
import SelectField from "./inputs/SelectField"
import CountrySelectField from "./inputs/CountrySelectField"
import StateSelectField from "./inputs/StateSelectField"
import ProfileFormFields from "../util/ProfileFormFields"
import { radioButtons, shouldRenderRomanizedFields } from "../util/profile_edit"
import { validationErrorSelector } from "../util/util"

import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc
} from "../flow/profileTypes"
import type { Validator, UIValidator } from "../lib/validation/profile"
import type { UIState } from "../reducers/ui"
import type { Option } from "../flow/generalTypes"
import RadioGroup from "@material-ui/core/RadioGroup"
import FormControl from "@material-ui/core/FormControl"
import FormHelperText from "@material-ui/core/FormHelperText"
import FormLabel from "@material-ui/core/FormLabel"
import { sendFormFieldEvent } from "../lib/google_analytics"

export default class PersonalForm extends ProfileFormFields {
  genderOptions: Array<Option> = [
    { value: "m", label: "Male" },
    { value: "f", label: "Female" },
    { value: "o", label: "Other/Prefer not to say" }
  ]
  languageOptions: Array<Option> = _.sortBy(
    LANGUAGE_CODES.map(language => ({
      value: language.alpha2,
      label: language.English
    })),
    "label"
  )

  props: {
    profile: Profile,
    errors: ValidationErrors,
    saveProfile: SaveProfileFunc,
    updateProfile: UpdateProfileFunc,
    validator: Validator | UIValidator,
    updateValidationVisibility: (xs: Array<string>) => void,
    ui: UIState
  }

  renderRomanizedFields = (): React$Element<*> => (
    <Grid item xs={12}>
      <section className="romanized-name">
        <h3>Please enter your name in Latin characters</h3>
        <Grid container className="profile-form-grid">
          <Grid item xs={6}>
            {this.boundTextField(["romanized_first_name"], "Given name")}
          </Grid>
          <Grid item xs={6}>
            {this.boundTextField(["romanized_last_name"], "Family name")}
          </Grid>
        </Grid>
      </section>
    </Grid>
  )

  showRomanizedFields = (): React$Element<*> | null =>
    shouldRenderRomanizedFields(this.props.profile)
      ? this.renderRomanizedFields()
      : null

  radioGroupField(
    keySet: string[],
    label: string,
    options: Option[]
  ): React$Element<*> {
    const {
      profile,
      updateProfile,
      errors,
      validator,
      updateValidationVisibility
    } = this.props
    const onChange = e => {
      const clone = _.cloneDeep(profile)
      let value = e.target.value
      if (value === "true") {
        value = true
      } else if (value === "false") {
        value = false
      }
      _.set(clone, keySet, value)
      updateValidationVisibility(keySet)
      updateProfile(clone, validator)
      sendFormFieldEvent(keySet)
    }

    const value = String(_.get(profile, keySet))
    const error = _.get(errors, keySet) !== undefined

    return (
      <FormControl error={error}>
        <FormLabel classes={{ root: "form-label" }}>{label}</FormLabel>
        <RadioGroup
          className={`profile-radio-group ${validationErrorSelector(
            errors,
            keySet
          )}`}
          name="gender"
          onChange={onChange}
          value={value}
        >
          {radioButtons(options)}
        </RadioGroup>
        <FormHelperText error>{_.get(errors, keySet)}</FormHelperText>
      </FormControl>
    )
  }

  render() {
    const { profile } = this.props

    const whyWeAskThis =
      "Some program sponsors and employers offer benefits or scholarships " +
      "to learners with specific backgrounds."

    // only show postal code for US and Canada
    let postalCodeField = null
    if (profile && ["US", "CA"].includes(profile.country)) {
      postalCodeField = (
        <Grid item xs={4} key="postal_code">
          {this.boundTextField(["postal_code"], "Postal code")}
        </Grid>
      )
    }

    return (
      <section>
        <h2 className="sr-only">Personal Information</h2>
        <p className="alert-info" role="alert">
          Please provide your legal name, and truthful information.
        </p>
        <Grid container spacing={3} className="profile-form-grid">
          <Grid item xs={6}>
            {this.boundTextField(["first_name"], "Given name")}
          </Grid>
          <Grid item xs={6}>
            {this.boundTextField(["last_name"], "Family name")}
          </Grid>
          {this.showRomanizedFields()}
          <p className="alert-info" role="alert">
            Do you prefer to use a name different that your legal name entered
            above? If so enter it below.
          </p>
          <Grid item xs={12}>
            {this.boundTextField(
              ["preferred_name"],
              "Nickname / Preferred name"
            )}
          </Grid>
          <Grid item xs={12}>
            {this.boundDateField(["date_of_birth"], "Date of birth")}
          </Grid>
          <Grid item xs={12} className="profile-gender-group">
            {this.radioGroupField(["gender"], "Gender", this.genderOptions)}
          </Grid>
          <Grid item xs={12}>
            <SelectField
              keySet={["preferred_language"]}
              label="Preferred language"
              options={this.languageOptions}
              {...this.defaultInputComponentProps()}
            />
          </Grid>
        </Grid>
        <section>
          <h3>Where are you currently living?</h3>
          <Grid container className="profile-form-grid">
            <Grid item xs={12}>
              <CountrySelectField
                stateKeySet={["state_or_territory"]}
                countryKeySet={["country"]}
                topMenu={true}
                label="Country"
                {...this.defaultInputComponentProps()}
              />
            </Grid>
            <Grid item xs={12} key="address">
              {this.boundTextField(["address"], "Street address", {
                maxLength: 100
              })}
            </Grid>
            <Grid item xs={4} key="city">
              {this.boundTextField(["city"], "City")}
            </Grid>
            <Grid item xs={4} key="state_or_territory">
              <StateSelectField
                stateKeySet={["state_or_territory"]}
                countryKeySet={["country"]}
                topMenu={true}
                label="State or Territory"
                {...this.defaultInputComponentProps()}
              />
            </Grid>
            {postalCodeField}
          </Grid>
        </section>
        <section>
          <h3>Where are you from?</h3>
          <span
            className="tooltip-link"
            data-tip
            data-for="why-we-ask-this"
            style={{ display: "inline-block" }}
          >
            (Why we ask this)
          </span>
          <ReactTooltip
            id="why-we-ask-this"
            effect="solid"
            event="click"
            globalEventOff="click"
          >
            {whyWeAskThis}
          </ReactTooltip>
          <Grid container spacing={3} className="profile-form-grid">
            <Grid item xs={4}>
              <CountrySelectField
                countryKeySet={["birth_country"]}
                label="Country of birth"
                topMenu={true}
                {...this.defaultInputComponentProps()}
              />
            </Grid>
            <Grid item xs={4}>
              <CountrySelectField
                countryKeySet={["nationality"]}
                label="Nationality"
                topMenu={true}
                {...this.defaultInputComponentProps()}
              />
            </Grid>
          </Grid>
        </section>
        <section>
          <h3>Telephone</h3>
          {this.boundTelephoneInput(["phone_number"])}
        </section>
      </section>
    )
  }
}
