import { assert } from "chai"
import _ from "lodash"
import sinon from "sinon"
import { shallow } from "enzyme"
import moment from "moment"
import R from "ramda"
import ga from "react-ga"
import { TextField } from "@material-ui/core"

import {
  boundTextField,
  boundDateField,
  boundTelephoneInput,
  saveProfileStep,
  shouldRenderRomanizedFields
} from "./profile_edit"
import * as dateValidation from "../lib/validation/date"
import { YEAR_VALIDATION_CUTOFF } from "../constants"
import { USER_PROFILE_RESPONSE } from "../test_constants"

describe("Profile Editing utility functions", () => {
  let that, sandbox, gaEvent
  const change = clone => (that.props.profile = clone)
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    gaEvent = sandbox.stub(ga, "event")
    that = {
      props: {
        profile: {
          account_privacy: "private",
          first_name:      "",
          date_of_birth:   "",
          gender:          undefined,
          date_field:      "",
          email_optin:     false,
          phone_number:    USER_PROFILE_RESPONSE.phone_number
        },
        errors: {
          first_name:      "First name is required",
          date_of_birth:   "Date of birth is required",
          gender:          "Gender is required",
          date_field:      "Date field is required",
          account_privacy: "Account privacy is required"
        },
        updateProfile:              change,
        updateValidationVisibility: sandbox.stub(),
        updateProfileValidation:    sandbox.stub(),
        ui:                         {}
      }
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("Bound Text field", () => {
    let textField
    beforeEach(() => {
      textField = boundTextField.call(that, ["first_name"], "First Name")
    })

    it("should correctly set props on itself", () => {
      assert.deepEqual("First Name", textField.props.name)
      assert.deepEqual("", textField.props.value)
    })

    it("should call the updateProfile callback when onChange fires", () => {
      textField.props.onChange({ target: { value: "foo" } })
      assert.deepEqual("foo", that.props.profile.first_name)
    })

    it("should use an empty string instead of undefined for the value prop", () => {
      const blankTextField = boundTextField.call(that, ["missing"], "Missing")
      assert.equal("", blankTextField.props.value)
    })

    it("should send a form field event to Google Analytics when onBlur fires", () => {
      textField.props.onBlur()
      assert(
        gaEvent.calledWith({
          category: "profile-form-field",
          action:   "completed-first_name",
          label:    "jane"
        })
      )
    })
  })

  describe("Bound date field", () => {
    let validateYearSpy, validateMonthSpy, validateDaySpy
    const renderDateField = allowFutureYear => {
      return shallow(
        boundDateField.call(
          that,
          ["date_of_birth"],
          "Date of birth",
          allowFutureYear
        )
      )
    }

    beforeEach(() => {
      validateYearSpy = sandbox.spy(dateValidation, "validateYear")
      validateMonthSpy = sandbox.spy(dateValidation, "validateMonth")
      validateDaySpy = sandbox.spy(dateValidation, "validateDay")
    })

    const _getInputProps = R.curry((idText, wrapper) => {
      return wrapper
        .find(TextField)
        .filterWhere(node => node.prop("helperText") === idText)
        .props()
    })

    const getMonthProps = _getInputProps("Month")
    const getYearProps = _getInputProps("Year")
    const getDayProps = _getInputProps("Day")

    const currentYear = moment().year()
    const cutoff = currentYear - YEAR_VALIDATION_CUTOFF
    const tooOld = cutoff - 5
    const tooYoung = currentYear + 5

    it("has proper props for an invalid or missing value", () => {
      for (const dateOfBirth of ["", {}, null, undefined]) {
        that.props.profile.date_of_birth = dateOfBirth
        const wrapper = renderDateField(false)
        const monthProps = getMonthProps(wrapper)
        const dayProps = getDayProps(wrapper)
        const yearProps = getYearProps(wrapper)

        assert.equal(monthProps.helperText, "Month")
        assert.equal(monthProps.placeholder, "MM")
        assert.equal(monthProps.value, "")
        assert.equal(dayProps.helperText, "Day")
        assert.equal(dayProps.placeholder, "DD")
        assert.equal(dayProps.value, "")
        assert.equal(yearProps.helperText, "Year")
        assert.equal(yearProps.placeholder, "YYYY")
        assert.equal(yearProps.value, "")
      }
    })

    it("has proper props for a defined valid value", () => {
      that.props.profile.date_of_birth = "1985-12-31"
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      const dayProps = getDayProps(wrapper)
      const yearProps = getYearProps(wrapper)

      assert.equal(monthProps.helperText, "Month")
      assert.equal(monthProps.placeholder, "MM")
      assert.equal(monthProps.value, 12)
      assert.equal(dayProps.helperText, "Day")
      assert.equal(dayProps.placeholder, "DD")
      assert.equal(dayProps.value, 31)
      assert.equal(yearProps.helperText, "Year")
      assert.equal(yearProps.placeholder, "YYYY")
      assert.equal(yearProps.value, 1985)
    })

    it("has proper props if we set omitDay to true", () => {
      that.props.profile.date_of_birth = "1985-12-31"
      const wrapper = renderDateField(true)
      const monthProps = getMonthProps(wrapper)
      const yearProps = getYearProps(wrapper)

      assert.equal(monthProps.helperText, "Month")
      assert.equal(monthProps.placeholder, "MM")
      assert.equal(monthProps.value, 12)
      assert.equal(yearProps.helperText, "Year")
      assert.equal(yearProps.placeholder, "YYYY")
      assert.equal(yearProps.value, 1985)
    })

    it("left pads month and day values when not editing", () => {
      that.props.profile.date_of_birth = "1917-01-07"
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      const dayProps = getDayProps(wrapper)
      assert.equal(monthProps.value, "01")
      assert.equal(dayProps.value, "07")
    })

    it("does not left pad month and day values when editing is in progress", () => {
      that.props.profile.date_of_birth = "1917-01-07"
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      monthProps.onChange({ target: { value: "2" } })
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "2",
        year:  "1917",
        day:   "07"
      })
    })

    it("rejects non-numerical input for the month field", () => {
      that.props.profile.date_of_birth = "1917-11-07"
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      monthProps.onChange({ target: { value: "text" } })
      assert.deepEqual(that.props.profile.date_of_birth, null)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "07",
        month: "",
        year:  "1917"
      })
    })

    it("accepts numerical input for the month field", () => {
      that.props.profile.date_of_birth = "1917-11-07"
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      monthProps.onChange({ target: { value: "08" } })
      assert.deepEqual(that.props.profile.date_of_birth, "1917-08-07")
    })

    it("rejects non-numerical input for the year field", () => {
      that.props.profile.date_of_birth = "1917-11-07"
      const wrapper = renderDateField(false)
      const yearProps = getYearProps(wrapper)
      yearProps.onChange({ target: { value: "text" } })
      assert.deepEqual(that.props.profile.date_of_birth, null)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "07",
        month: "11",
        year:  ""
      })
    })

    it("accepts numerical input for the year field", () => {
      that.props.profile.date_of_birth = "1917-11-07"
      const wrapper = renderDateField(false)
      const yearProps = getYearProps(wrapper)
      yearProps.onChange({ target: { value: "1918" } })
      assert.deepEqual(that.props.profile.date_of_birth, "1918-11-07")
    })

    it("only accepts inputs that are valid months, converting when necessary", () => {
      that.props.profile.date_of_birth = "1917-11-07"
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      monthProps.onChange({ target: { value: "233" } })
      assert.deepEqual(that.props.profile.date_of_birth, "1917-12-07")
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "07",
        month: "12",
        year:  "1917"
      })
    })

    describe("year rounding", () => {
      it("only accepts years later than 120 years ago", () => {
        that.props.profile.date_of_birth = "1917-11-07"
        const wrapper = renderDateField(false)
        const yearProps = getYearProps(wrapper)
        yearProps.onChange({ target: { value: tooOld } })
        assert.deepEqual(that.props.profile.date_of_birth, `${cutoff}-11-07`)
        assert.deepEqual(that.props.profile.date_of_birth_edit, {
          day:   "07",
          month: "11",
          year:  `${cutoff}`
        })
      })

      it("only accepts years earlier or equal to this year", () => {
        that.props.profile.date_of_birth = "1917-11-07"
        const wrapper = renderDateField(false)
        const yearProps = getYearProps(wrapper)
        yearProps.onChange({ target: { value: tooYoung } })
        assert.deepEqual(
          that.props.profile.date_of_birth,
          `${currentYear}-11-07`
        )
        assert.deepEqual(that.props.profile.date_of_birth_edit, {
          day:   "07",
          month: "11",
          year:  `${currentYear}`
        })
      })
    })

    it("updates the day edit value when the day TextField onChange is used", () => {
      const wrapper = renderDateField(false)
      const dayProps = getDayProps(wrapper)
      dayProps.onChange({ target: { value: "12" } })

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "12",
        month: "",
        year:  ""
      })
    })

    it("updates the month edit value when the month TextField onChange is used", () => {
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      monthProps.onChange({ target: { value: "12" } })

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "",
        month: "12",
        year:  ""
      })
    })

    it("updates the year edit value when the year TextField onChange is used", () => {
      const wrapper = renderDateField(false)
      const yearProps = getYearProps(wrapper)
      yearProps.onChange({ target: { value: "1992" } })

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "",
        month: "",
        year:  "1992"
      })
    })

    it("updates the day correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day:   "15",
        month: "8",
        year:  "1991"
      }
      const wrapper = renderDateField(false)
      const dayProps = getDayProps(wrapper)
      dayProps.onChange({ target: { value: "11" } })
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "11",
        month: "8",
        year:  "1991"
      })
    })

    it("updates the month correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day:   "09",
        month: "11",
        year:  "1965"
      }
      const wrapper = renderDateField(false)
      const monthProps = getMonthProps(wrapper)
      monthProps.onChange({ target: { value: "8" } })
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "09",
        month: "8",
        year:  "1965"
      })
    })

    it("updates the year correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day:   "09",
        month: "11",
        year:  "1965"
      }
      const wrapper = renderDateField(false)
      const yearProps = getYearProps(wrapper)
      yearProps.onChange({ target: { value: "1991" } })
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "09",
        month: "11",
        year:  "1991"
      })
    })

    it("updates the formatted date if month and year are valid and omitDay is true", () => {
      let wrapper = renderDateField(true)
      getMonthProps(wrapper).onChange({ target: { value: "12" } })
      wrapper = renderDateField(true)
      getYearProps(wrapper).onChange({ target: { value: tooYoung } })

      assert.equal(that.props.profile.date_of_birth, `${currentYear}-12-01`)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "12",
        year:  `${currentYear}`,
        day:   undefined
      })
    })

    it("updates the formatted date if day, month and year are valid and omitDay is false", () => {
      let wrapper = renderDateField(false)
      getDayProps(wrapper).onChange({ target: { value: "1" } })
      wrapper = renderDateField(false)
      getMonthProps(wrapper).onChange({ target: { value: "12" } })
      wrapper = renderDateField(false)
      getYearProps(wrapper).onChange({ target: { value: tooYoung } })

      assert.equal(that.props.profile.date_of_birth, `${currentYear}-12-01`)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "12",
        year:  `${currentYear}`,
        day:   "1"
      })
    })

    it("stores text in date_of_birth_edit if it's not a valid date", () => {
      that.props.profile.date_of_birth = `${tooYoung}-02-28`
      const wrapper = renderDateField(false)
      getMonthProps(wrapper).onChange({ target: { value: "MONTH" } })
      renderDateField(false)

      assert.deepEqual(that.props.profile.date_of_birth, null)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "28",
        month: "",
        year:  `${currentYear}`
      })
    })

    it("uses a day of 1 if omitDate is true", () => {
      that.props.profile.date_of_birth = `${tooYoung}-02-28`
      let wrapper = renderDateField(true)
      getMonthProps(wrapper).onChange({ target: { value: "13" } })
      wrapper = renderDateField(true)
      getMonthProps(wrapper).onChange({ target: { value: "1" } })

      assert.deepEqual(that.props.profile.date_of_birth, `${currentYear}-01-01`)
      // day is 28 here but it's discarded in the timestamp above, resulting in 01
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "1",
        year:  `${currentYear}`,
        day:   "28"
      })
    })

    it("uses validateDay for validation", () => {
      const wrapper = renderDateField(false)
      getDayProps(wrapper).onChange({ target: { value: "a day" } })
      assert(validateDaySpy.calledWith("a day"))
    })

    it("uses validateMonth for validation", () => {
      const wrapper = renderDateField(false)
      getMonthProps(wrapper).onChange({ target: { value: "a month" } })
      assert(validateMonthSpy.calledWith("a month"))
    })

    it("uses validateYear for validation", () => {
      const wrapper = renderDateField(false)
      getYearProps(wrapper).onChange({ target: { value: "a year" } })
      assert(validateYearSpy.calledWith("a year"))
    })

    it("uses moment.js for validation", () => {
      renderDateField(false)
      that.props.profile.date_of_birth = `${tooYoung}-02-28`
      const wrapper = renderDateField(false)
      getDayProps(wrapper).onChange({ target: { value: "31" } })
      renderDateField(false)

      // Feb 31 is not a valid date, and only moment.js knows that
      assert.deepEqual(that.props.profile.date_of_birth, null)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "31",
        month: "02",
        year:  `${currentYear}`
      })
    })

    it("treats an empty date string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = `${tooYoung}-02-28`
      const wrapper = renderDateField(false)
      getDayProps(wrapper).onChange({ target: { value: "" } })
      assert.deepEqual(that.props.profile.date_of_birth, null)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "",
        month: "02",
        year:  `${currentYear}`
      })
    })

    it("treats an empty month string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = `${tooYoung}-02-28`
      const wrapper = renderDateField(false)
      getMonthProps(wrapper).onChange({ target: { value: "" } })
      assert.deepEqual(that.props.profile.date_of_birth, null)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "28",
        month: "",
        year:  `${currentYear}`
      })
    })

    it("treats an empty year string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = `${tooYoung}-02-28`
      const wrapper = renderDateField(false)
      getYearProps(wrapper).onChange({ target: { value: "" } })
      assert.deepEqual(that.props.profile.date_of_birth, null)
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day:   "28",
        month: "02",
        year:  ""
      })
    })

    it("send a form field event to Google Analytics when onBlur is called", () => {
      const wrapper = renderDateField()
      getYearProps(wrapper).onBlur()
      assert(
        gaEvent.calledWith({
          category: "profile-form-field",
          action:   "completed-date_of_birth",
          label:    "jane"
        })
      )
    })
  })

  describe("boundTelephoneInput", () => {
    let input, telephoneInput, telephoneSpan

    const rerender = () => {
      input = boundTelephoneInput.call(that, ["phone_number"])
      ;[telephoneInput, telephoneSpan] = input.props.children
    }

    beforeEach(() => {
      rerender()
    })

    it("should correctly set props on itself", () => {
      const { value, onChange, onBlur, flagsImagePath } = telephoneInput.props
      assert.equal(value, USER_PROFILE_RESPONSE.phone_number)
      assert.isFunction(onChange)
      assert.isFunction(onBlur)
      assert.equal(flagsImagePath, "/static/images/flags.png")
    })

    it("should send a form event to Google Analytics when onBlur fires", () => {
      telephoneInput.props.onBlur()
      assert(
        gaEvent.calledWith({
          category: "profile-form-field",
          action:   "completed-phone_number",
          label:    "jane"
        })
      )
    })

    it("should render validation errors", () => {
      that.props.errors.phone_number = "an error"
      rerender()
      const { className } = input.props
      const { children } = telephoneSpan.props
      assert.equal(children, "an error")
      assert.equal(className, "bound-telephone invalid-input")
    })

    it("should render without a value", () => {
      that.props.profile.phone_number = null
      rerender()
      const { value } = telephoneInput.props
      assert.equal(value, "")
    })

    it("should call updateProfile when onChange fires", () => {
      telephoneInput.props.onChange("+44 0207 123 4567")
      assert.equal(that.props.profile.phone_number, "+44 0207 123 4567")
    })
  })

  describe("saveProfileStep", () => {
    const saveProfileReturnValue = "value"
    beforeEach(() => {
      that.props.saveProfile = sandbox.stub()
      that.props.saveProfile.returns(saveProfileReturnValue)
      that.props.profile.filled_out = false
    })

    it("saves with finalStep as true", () => {
      const func = () => null
      const ret = saveProfileStep.call(that, func, true)

      const clone = {
        ...that.props.profile,
        filled_out:  true,
        email_optin: true
      }

      assert.ok(that.props.saveProfile.calledWith(func, clone, that.props.ui))
      assert.equal(ret, saveProfileReturnValue)
    })
  })

  describe("shouldRenderRomanizedFields", () => {
    it("when first and last names are empty", () => {
      const profile = _.cloneDeep(USER_PROFILE_RESPONSE)
      profile.first_name = ""
      profile.last_name = ""
      assert.isNotTrue(shouldRenderRomanizedFields(profile))
    })

    it("when first name is non cp-1252", () => {
      const profile = _.cloneDeep(USER_PROFILE_RESPONSE)
      profile.first_name = "عامر"
      profile.last_name = "example"
      assert.isTrue(shouldRenderRomanizedFields(profile))
    })

    it("when last name is non cp-1252", () => {
      const profile = _.cloneDeep(USER_PROFILE_RESPONSE)
      profile.first_name = "example"
      profile.last_name = "عامر"
      assert.isTrue(shouldRenderRomanizedFields(profile))
    })

    it("when first and last names are valid cp-1252", () => {
      const profile = _.cloneDeep(USER_PROFILE_RESPONSE)
      profile.first_name = "ââio"
      profile.last_name = "khan"
      assert.isNotTrue(shouldRenderRomanizedFields(profile))
    })

    it("when no profile", () => {
      assert.isNotTrue(shouldRenderRomanizedFields())
    })
  })
})
