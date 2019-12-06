// @flow
/* global SETTINGS: false */
import DocumentTitle from "react-document-title"
import React from "react"
import _ from "lodash"
import Card from "@material-ui/core/Card"
import FormControl from "@material-ui/core/FormControl"
import FormLabel from "@material-ui/core/FormLabel"
import RadioGroup from "@material-ui/core/RadioGroup"
import CardContent from "@material-ui/core/CardContent"

import ProfileFormFields from "../util/ProfileFormFields"
import { sendFormFieldEvent } from "../lib/google_analytics"
import { radioButtons } from "../util/profile_edit"
import type {
  Profile,
  ValidationErrors,
  UpdateProfileFunc
} from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import type { Validator } from "../lib/validation/profile"
import type { Option } from "../flow/generalTypes"

class PrivacyForm extends ProfileFormFields {
  props: {
    profile: Profile,
    ui: UIState,
    updateProfile: UpdateProfileFunc,
    errors: ValidationErrors,
    updateValidationVisibility: (xs: Array<string>) => void,
    validator: Validator
  }

  privacyOptions: Array<Option> = [
    {
      value:  "public",
      label:  "Public to the world",
      helper: `Your MicroMasters profile will be 
      visible to all website visitors.`
    },
    {
      value:  "public_to_mm",
      label:  "Public to other MicroMasters students",
      helper: `Your profile will be 
      visible to other MicroMasters learners, and to MIT faculty and staff.`
    },
    {
      value:  "private",
      label:  "Private",
      helper: `Your MicroMasters profile will only 
      be visible to MIT faculty and staff.`
    }
  ]

  emailOptions: Array<Option> = [
    {
      value: "true",
      label: "Faculty, staff, and other learners can send me emails"
    },
    { value: "false", label: "I don't want to receive any emails" }
  ]

  radioGroupField(
    keySet: string[],
    label: string,
    options: Option[]
  ): React$Element<*> {
    const {
      profile,
      updateProfile,
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
    return (
      <FormControl>
        <FormLabel>{label}</FormLabel>
        <RadioGroup
          className="profile-radio-group"
          name={label}
          onChange={onChange}
          value={value}
        >
          {radioButtons(options)}
        </RadioGroup>
      </FormControl>
    )
  }

  render() {
    return (
      <DocumentTitle title="Settings | MITx MicroMasters">
        <div>
          <Card shadow={1} className="card profile-form">
            <CardContent>
              <h4 className="privacy-form-heading">
                Who can see your profile?
              </h4>
              <div className="profile-form-row">
                {this.radioGroupField(
                  ["account_privacy"],
                  "",
                  this.privacyOptions
                )}
              </div>
            </CardContent>
          </Card>
          <Card shadow={1} className="card profile-form">
            <CardContent>
              <h4 className="privacy-form-heading">Email Preferences</h4>
              <div className="profile-form-row">
                {this.radioGroupField(["email_optin"], "", this.emailOptions)}
              </div>
            </CardContent>
          </Card>
        </div>
      </DocumentTitle>
    )
  }
}

export default PrivacyForm
