import React from "react"
import { assert } from "chai"
import _ from "lodash"
import sinon from "sinon"
import { mount } from "enzyme"
import VirtualizedSelect from "react-virtualized-select"
import R from "ramda"
import ga from "react-ga"

import { USER_PROFILE_RESPONSE } from "../../test_constants"
import iso3166 from "@mitodl/iso-3166-2"
import { modifyWrapperSelectField } from "../../util/test_utils"
import SelectField from "./SelectField"
import CountrySelectField from "./CountrySelectField"
import StateSelectField from "./StateSelectField"

describe("Profile inputs", () => {
  let inputProps, sandbox, updateProfileStub

  const change = newProfile => (inputProps.profile = newProfile)

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    updateProfileStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderTestSelectField = props => mount(<SelectField {...props} />)

  describe("Select field", () => {
    let selectField, gaEvent

    const genderOptions = [
      { value: "m", label: "Male" },
      { value: "f", label: "Female" },
      { value: "o", label: "Other/Prefer not to say" }
    ]

    const renderGenderSelectField = (props = {}) => {
      return renderTestSelectField({
        ...inputProps,
        keySet:        ["gender"],
        label:         "Gender",
        options:       genderOptions,
        updateProfile: updateProfileStub,
        ...props
      })
    }

    beforeEach(() => {
      gaEvent = sandbox.stub(ga, "event")
      inputProps = {
        profile: {
          account_privacy: "private",
          first_name:      "",
          date_of_birth:   "",
          gender:          undefined,
          date_field:      ""
        },
        errors: {
          first_name:      "First name is required",
          date_of_birth:   "Date of birth is required",
          gender:          "Gender is required",
          date_field:      "Date field is required",
          account_privacy: "Account privacy is required"
        },
        updateProfile:              change,
        updateValidationVisibility: sandbox.stub()
      }
    })

    it("should set props correctly", () => {
      selectField = renderGenderSelectField().find(VirtualizedSelect)
      const props = selectField.props()
      assert.deepEqual(props.options, genderOptions)
      assert.equal(props.label, "Gender")
    })

    it("should update the selected option when onChange fires with an option", () => {
      selectField = renderGenderSelectField().find(VirtualizedSelect)
      modifyWrapperSelectField(selectField, "f")
      assert.ok(
        updateProfileStub.calledWith({
          account_privacy: "private",
          first_name:      "",
          date_of_birth:   "",
          gender:          "f",
          date_field:      ""
        })
      )
    })

    it("should have the correct option selected", () => {
      inputProps.profile.gender = "f"
      selectField = renderGenderSelectField().find(VirtualizedSelect)
      assert.equal(selectField.props().value, "f")
    })

    it("should let you enter a new option, if the allowCreate option is passed", () => {
      selectField = renderGenderSelectField({ allowCreate: true }).find(
        VirtualizedSelect
      )
      modifyWrapperSelectField(selectField, "genderqueer")
      assert.ok(
        updateProfileStub.calledWith({
          account_privacy: "private",
          first_name:      "",
          date_of_birth:   "",
          gender:          "genderqueer",
          date_field:      ""
        }),
        "should be called with the right thing"
      )
    })

    it("should set the correct className and id", () => {
      const selectFieldWrapper = renderGenderSelectField({ allowCreate: true })
      const wrapperDiv = selectFieldWrapper.find("div").first()
      assert.ok(
        wrapperDiv.hasClass("select-field"),
        "should have the right class"
      )
      assert.ok(wrapperDiv.hasClass("gender"), "should have the right class")
      assert.include(wrapperDiv.props().id, "gender")
    })

    it("should enter the new option in the options list", () => {
      const selectField = renderGenderSelectField({ allowCreate: true }).find(
        VirtualizedSelect
      )
      modifyWrapperSelectField(selectField, "genderqueer")
      const newOption = selectField
        .props()
        .options.find(option => option.value === "genderqueer")
      assert.deepEqual(newOption, {
        value:     "genderqueer",
        label:     "genderqueer",
        className: "Select-create-option-placeholder"
      })
    })

    it("should broadcast the new option back to the store", () => {
      selectField = renderGenderSelectField({
        allowCreate:   true,
        updateProfile: change,
        profile:       {}
      }).find(VirtualizedSelect)
      modifyWrapperSelectField(selectField, "genderqueer")
      assert.equal(inputProps.profile.gender, "genderqueer")
    })

    it("should properly add options to this.state", () => {
      inputProps.profile = {}
      const props = {
        allowCreate:   true,
        updateProfile: change
      }
      selectField = renderGenderSelectField(props)
      modifyWrapperSelectField(
        selectField.find(VirtualizedSelect),
        "genderqueer"
      )
      selectField.setProps({ ...inputProps, ...props })
      assert.deepEqual(selectField.state(), {
        customOptions: [{ value: "genderqueer", label: "genderqueer" }]
      })
    })

    it("should add a previously saved custom option to this.state", () => {
      selectField = renderGenderSelectField({
        allowCreate: true,
        profile:     {
          gender: "agender"
        }
      })
      assert.include(selectField.text(), "agender")
      const expectedCustomOption = {
        value: "agender",
        label: "agender"
      }
      assert.deepEqual(selectField.state(), {
        customOptions: [expectedCustomOption]
      })
      assert.deepInclude(
        selectField.find(VirtualizedSelect).props().options,
        expectedCustomOption
      )
    })

    it("should send a form field event to Google Analytics when onBlur is called", () => {
      selectField = renderGenderSelectField().find(VirtualizedSelect)
      selectField.props().onBlur()
      assert(
        gaEvent.calledWith({
          category: "profile-form-field",
          action:   "completed-gender",
          label:    "jane"
        })
      )
    })
  })

  describe("State select field", () => {
    beforeEach(() => {
      inputProps = {
        stateKeySet:   ["state_key"],
        countryKeySet: ["country_key"],
        label:         "State",
        profile:       { ...USER_PROFILE_RESPONSE },
        errors:        {},
        updateProfile: change
      }
    })

    const renderStateSelect = () => mount(<StateSelectField {...inputProps} />)

    it("lists no states when an invalid country is selected", () => {
      inputProps.profile.country_key = "MISSING"
      const stateField = renderStateSelect()
      assert.lengthOf(stateField.find(SelectField).props().options, 0)
    })

    it("renders a select field with sorted states for the given country", () => {
      const country = "US"
      // Get a list of US state values (eg: 'US-MA') ordered by the state name
      const orderedUSStateValues = _(iso3166.data[country].sub)
        .toPairs()
        .sortBy(keyValueList => {
          return keyValueList[1]["name"]
        })
        .map(keyValueList => {
          return keyValueList[0]
        })
        .value()
      inputProps.profile.country_key = country
      const stateField = renderStateSelect()
      const optionValueList = stateField
        .find(SelectField)
        .props()
        .options.map(option => {
          return option.value
        })
      assert.deepEqual(optionValueList, orderedUSStateValues)
    })
  })

  describe("Country select field", () => {
    beforeEach(() => {
      inputProps = {
        stateKeySet:   ["state_key"],
        countryKeySet: ["country_key"],
        label:         "Country",
        profile:       { ...USER_PROFILE_RESPONSE },
        errors:        {},
        updateProfile: change
      }
    })

    const renderCountrySelect = () =>
      mount(<CountrySelectField {...inputProps} />)

    const checkFieldText = text => {
      const countryField = renderCountrySelect()
      assert.include(countryField.text(), text)
    }

    it("shows a list of countries", () => {
      inputProps.profile.country_key = null
      inputProps.profile.country = null
      const countryField = renderCountrySelect()
      const props = countryField.find(SelectField).props()
      assert.lengthOf(props.options, _.keys(iso3166.data).length)
      // Check for a random list of country values that should exist as options in the select field
      const countriesToFind = ["AF", "AL", "US", "IN", "NZ"]
      const countriesInCommon = R.intersection(
        R.map(R.prop("value"), props.options),
        countriesToFind
      )
      assert.equal(countriesInCommon.length, countriesToFind.length)
    })

    it("clears the state state when the country changes", () => {
      inputProps.profile.country_key = "US"
      inputProps.profile.state_key = "US-MA"
      const countryField = renderCountrySelect()
      countryField
        .find(SelectField)
        .props()
        .onChange({ value: "AL" })
      assert.equal(inputProps.profile.country_key, "AL")
      assert.equal(inputProps.profile.state_key, null)
    })

    it("should have different labels for the different virgin islands", () => {
      inputProps.profile.country_key = "VI"
      checkFieldText("US Virgin Islands")

      inputProps.profile.country_key = "VG"
      checkFieldText("British Virgin Islands")
    })
  })
})
