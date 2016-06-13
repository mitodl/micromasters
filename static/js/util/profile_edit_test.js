import React from 'react';
import { assert } from 'chai';
import iso3166 from 'iso-3166-2';
import _ from 'lodash';
import MenuItem from 'material-ui/MenuItem';
import sinon from 'sinon';

import {
  boundTextField,
  boundDateField,
  boundSelectField,
  boundStateSelectField,
  boundCountrySelectField,
  boundRadioGroupField,
  saveProfileStep,
} from './profile_edit';
import { USER_PROFILE_RESPONSE } from '../constants';
import * as profileEdit from '../util/profile_edit';
import * as validation from '../util/validation';

describe('Profile Editing utility functions', () => {
  let that, sandbox;
  const change = (clone) => that.props.profile = clone;
  beforeEach(() => {
    that = {
      props: {
        profile: {
          "account_privacy": "private",
          "first_name": "",
          "date_of_birth": "",
          "gender": undefined,
          "date_field": ""
        },
        errors: {
          "first_name": "First name is required",
          "date_of_birth": "Date of birth is required",
          "gender": "Gender is required",
          "date_field": "Date field is required",
          "account_privacy": "Account privacy is required"
        },
        updateProfile: change,
        ui: {}
      }
    };
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Bound radio group', () => {
    let radioGroup, labelSpan, errorSpan;
    let privacyOptions = [
      { value: 'public', label: 'Public to the world', helper: `We will publish your Micromasters 
        profile on our website.` },
      { value: 'public_to_mm', label: 'Public to other micromasters students', helper: `Your Micromasters profile 
        will only be viewable by other learners in your program, and by MIT faculity and staff.` },
      { value: 'private', label: 'Private', helper: `Your Micromasters profile will be viewable only by 
        MIT faculty and staff.` }
    ];

    let rerender = () => {
      let component = boundRadioGroupField.call(
        that,
        ["account_privacy"],
        "Privacy level",
        privacyOptions
      );
      [labelSpan, radioGroup, errorSpan] = component.props.children;
    };

    beforeEach(() => {
      rerender();
    });

    it('should correctly set props on itself', () => {
      assert.equal("Privacy level", radioGroup.props.name);
      assert.equal("Privacy level", labelSpan.props.children);
      assert.equal("private", radioGroup.props.valueSelected);
      assert.equal("Account privacy is required", errorSpan.props.children);
    });

    it('should render when there is no set value', () => {
      that.props.account_privacy = undefined;
      rerender();
      assert.deepEqual('private', radioGroup.props.valueSelected);
    });

    it('should call the updateProfile callback when onChange fires', () => {
      radioGroup.props.onChange({target: {value: "public_to_mm"}});
      rerender();
      assert.deepEqual("public_to_mm", that.props.profile.account_privacy);
      assert.deepEqual("public_to_mm", radioGroup.props.valueSelected);
    });
  });

  describe('Bound Text field', () => {
    let textField;
    beforeEach(() => {
      textField = boundTextField.call(
        that,
        ["first_name"],
        "First Name"
      );
    });

    it('should correctly set props on itself', () => {
      assert.deepEqual('First Name', textField.props.floatingLabelText);
      assert.deepEqual('First name is required', textField.props.errorText);
      assert.deepEqual('', textField.props.value);
    });

    it('should call the updateProfile callback when onChange fires', () => {
      textField.props.onChange({target: {value: "foo"}});
      assert.deepEqual("foo", that.props.profile.first_name);
    });

    it('should use an empty string instead of undefined for the value prop', () => {
      let blankTextField = boundTextField.call(that, ["missing"], "Missing");
      assert.equal('', blankTextField.props.value);
    });
  });

  describe('Bound select field', () => {
    let selectField;
    let genderOptions = [
      {value: 'm', label: 'Male'},
      {value: 'f', label: 'Female'},
      {value: 'o', label: 'Other/Prefer not to say'}
    ];

    beforeEach(() => {
      selectField = boundSelectField.call(
        that,
        ['gender'],
        "Gender",
        genderOptions
      );
    });

    it('should set props correctly', () => {
      assert.equal(selectField.props.dataSource.length, genderOptions.length);
      for (let i = 0; i < genderOptions.length; i++) {
        let item = selectField.props.dataSource[i];
        let option = genderOptions[i];
        assert.equal(option.label, item.text);
        assert.equal(option.label, item.value.props.primaryText);
        assert.equal(option.value, item.value.props.value);
      }
      assert.equal(selectField.props.floatingLabelText, 'Gender');
      assert.equal(selectField.props.searchText, "");
      assert.ok(selectField.props.openOnFocus);
      assert.equal(selectField.props.errorText, "Gender is required");

    });

    it('should filter by case insensitive prefix', () => {
      let filter = selectField.props.filter;
      assert(filter("mal", "Male"));
      // prefix doesn't match
      assert(!filter("mal", "Female"));
    });

    it('should update the selected option when onNewRequest fires with an option', () => {
      let option = genderOptions[1];
      selectField.props.onNewRequest({
        text: option.label,
        value: <MenuItem primaryText={option.label} value={option.value} />
      }, 0);
      assert.equal(that.props.profile.gender, 'f');
    });

    it('should update the selected option when the enter key is pressed', () => {
      selectField.props.onNewRequest('other', -1);
      assert.equal(that.props.profile.gender, 'o');
    });

    it("should not update the selected option when the enter key is pressed and text doesn't match", () => {
      that.props.profile.gender = 'm';
      selectField.props.onNewRequest('x', -1);
      assert.equal(that.props.profile.gender, 'm');
    });

    it('should have the correct option selected', () => {
      that.props.profile.gender = 'f';
      selectField = boundSelectField.call(
        that,
        ['gender'],
        "Gender",
        genderOptions
      );

      assert.equal(selectField.props.searchText, 'Female');
    });

    it('should update the edit state when onUpdateInput is called', () => {
      selectField = boundSelectField.call(
        that,
        ['gender'],
        "Gender",
        genderOptions
      );
      selectField.props.onUpdateInput("update input text");

      assert.equal(that.props.profile.gender_edit, "update input text");
    });

    it('should clear edit text when onBlur is called', () => {
      that.props.profile.gender = 'f';
      that.props.profile.gender_edit = 'text not matching anything';
      selectField = boundSelectField.call(
        that,
        ['gender'],
        "Gender",
        genderOptions
      );
      selectField.props.onBlur();

      assert.equal(that.props.profile.gender, 'f');
      assert.equal(that.props.profile.gender_edit, undefined);
    });

    it('should display the edit text if it is set', () => {
      const text = 'text typed in';
      that.props.profile.gender_edit = text;
      that.props.profile.gender = 'f';
      selectField = boundSelectField.call(
        that,
        ['gender'],
        "Gender",
        genderOptions
      );
      assert.equal(selectField.props.searchText, text);
    });
  });

  describe("Bound state select field", () => {
    let boundSelectFieldSpy;
    beforeEach(() => {
      boundSelectFieldSpy = sandbox.spy(profileEdit, 'boundSelectField');
    });

    it('lists no states when an invalid country is selected', () => {
      const country = "MISSING";
      const state = "MISSING";
      let profile = Object.assign({}, USER_PROFILE_RESPONSE, {
        country_key: country,
        state_key: state
      });

      let stateSelectField = boundStateSelectField.bind({
        props: {
          profile,
          updateProfile: () => null
        }
      });

      let label = "LABEL";
      let stateKey = ["state_key"];
      stateSelectField(stateKey, ["country_key"], label);
      assert(boundSelectFieldSpy.calledWith(stateKey, label, []));
    });

    it('renders a select field with sorted states for the given country', () => {
      const country = "US";
      const state = "US-MA";
      const placeholder = "PLACEHOLDER";
      const error = "ERROR";
      let profile = Object.assign({}, USER_PROFILE_RESPONSE, {
        country_key: country,
        state_key: state
      });

      let stateSelectField = boundStateSelectField.bind({
        props: {
          profile,
          errors: {
            state_key: error
          },
          updateProfile: () => null
        }
      });

      let stateKey = ["state_key"];
      stateSelectField(stateKey, ["country_key"], placeholder);
      let options = Object.keys(iso3166.data[country].sub).map(code => ({
        value: code,
        label: iso3166.data[country].sub[code].name
      }));
      options = _.sortBy(options, 'label');

      assert(boundSelectFieldSpy.calledWith(stateKey, placeholder, options));
    });
  });

  describe("Bound country select field", () => {
    let boundSelectFieldSpy, countryOptions;
    beforeEach(() => {
      boundSelectFieldSpy = sandbox.spy(profileEdit, 'boundSelectField');

      countryOptions = Object.keys(iso3166.data).map(code => ({
        value: code,
        label: iso3166.data[code]['name']
      }));
      countryOptions = _.sortBy(countryOptions, 'label');
    });


    it('shows a list of countries', () => {
      const country = null;
      const state = null;
      let profile = Object.assign({}, USER_PROFILE_RESPONSE, {
        country_key: country,
        state_key: state
      });

      let updateProfile = newProfile => {
        profile = newProfile;
      };

      let countrySelectField = boundCountrySelectField.bind({
        props: {
          profile,
          updateProfile
        },
        countryOptions
      });

      let stateKeySet = ["state_key"];
      let countryKeySet = ["country_key"];
      let label = "LABEL";
      countrySelectField(stateKeySet, countryKeySet, label);

      let call = boundSelectFieldSpy.getCall(0);
      assert.deepEqual(call.args[0], countryKeySet);
      assert.deepEqual(call.args[1], label);
      assert.deepEqual(call.args[2], countryOptions);

      let onChange = call.args[3];
      assert(_.isFunction(onChange));

      onChange("change");
      assert.deepEqual(profile, "change");
    });

    it('clears the state state when the country changes', () => {
      const country = 'US';
      const state = 'US-MA';
      let profile = Object.assign({}, USER_PROFILE_RESPONSE, {
        country_key: country,
        state_key: state
      });

      let updateProfile = newProfile => {
        profile = newProfile;
      };

      let countrySelectField = boundCountrySelectField.bind({
        props: {
          profile,
          updateProfile
        },
        countryOptions
      });

      let stateKeySet = ["state_key"];
      let countryKeySet = ["country_key"];
      let label = "LABEL";
      let field = countrySelectField(stateKeySet, countryKeySet, label);
      field.props.onNewRequest('Ghana', -1);

      assert.equal(profile.country_key, "GH");
      assert.equal(profile.state_key, null);
    });
  });

  describe("Bound date field", () => {
    let dateField, dayTextField, monthTextField, yearTextField;
    let validateYearSpy, validateMonthSpy, validateDaySpy;
    let renderDateField = (...args) => {
      dateField = boundDateField.call(
        that,
        ["date_of_birth"],
        "Date of birth",
        ...args
      );

      return dateField.props.children.filter(React.isValidElement);
    };

    beforeEach(() => {
      validateYearSpy = sandbox.spy(validation, 'validateYear');
      validateMonthSpy = sandbox.spy(validation, 'validateMonth');
      validateDaySpy = sandbox.spy(validation, 'validateDay');
    });

    afterEach(() => {
      yearTextField = null;
      monthTextField = null;
      dayTextField = null;
    });

    let rerender = omitDay => {
      if (omitDay) {
        [monthTextField, , yearTextField] = renderDateField(true);
      } else {
        [monthTextField, , dayTextField, , yearTextField] = renderDateField(false);
      }
    };

    it("has proper props for an invalid or missing value", () => {
      for (let dateOfBirth of ['', {}, null, undefined]) {
        that.props.profile.date_of_birth = dateOfBirth;
        rerender(false);

        assert.equal(monthTextField.props.floatingLabelText, "Date of birth");
        assert.equal(monthTextField.props.hintText, "MM");
        assert.equal(monthTextField.props.value, "");
        assert.equal(monthTextField.props.errorText, "Date of birth is required");
        assert.equal(dayTextField.props.floatingLabelText, " ");
        assert.equal(dayTextField.props.hintText, "DD");
        assert.equal(dayTextField.props.value, "");
        assert.equal(yearTextField.props.floatingLabelText, " ");
        assert.equal(yearTextField.props.hintText, "YYYY");
        assert.equal(yearTextField.props.value, "");
      }
    });

    it("has proper props for a defined valid value", () => {
      that.props.profile.date_of_birth = "1985-12-31";
      rerender(false);

      assert.equal(monthTextField.props.floatingLabelText, "Date of birth");
      assert.equal(monthTextField.props.hintText, "MM");
      assert.equal(monthTextField.props.value, 12);
      assert.equal(monthTextField.props.errorText, "Date of birth is required");
      assert.equal(dayTextField.props.floatingLabelText, " ");
      assert.equal(dayTextField.props.hintText, "DD");
      assert.equal(dayTextField.props.value, 31);
      assert.equal(yearTextField.props.floatingLabelText, " ");
      assert.equal(yearTextField.props.hintText, "YYYY");
      assert.equal(yearTextField.props.value, 1985);
    });

    it("has proper props if we set omitDay to true", () => {
      that.props.profile.date_of_birth = "1985-12-31";
      rerender(true);

      assert.equal(monthTextField.props.floatingLabelText, "Date of birth");
      assert.equal(monthTextField.props.hintText, "MM");
      assert.equal(monthTextField.props.value, 12);
      assert.equal(monthTextField.props.errorText, "Date of birth is required");
      assert.equal(yearTextField.props.floatingLabelText, " ");
      assert.equal(yearTextField.props.hintText, "YYYY");
      assert.equal(yearTextField.props.value, 1985);
    });

    it("updates the day edit value when the day TextField onChange is used", () => {
      rerender(false);
      dayTextField.props.onChange({target: {value: "text"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "text",
        month: undefined,
        year: undefined
      });
    });

    it("updates the month edit value when the month TextField onChange is used", () => {
      rerender(false);
      monthTextField.props.onChange({target: {value: "text"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: undefined,
        month: "text",
        year: undefined
      });
    });

    it("updates the year edit value when the year TextField onChange is used", () => {
      rerender(false);
      yearTextField.props.onChange({target: {value: "text"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: undefined,
        month: undefined,
        year: "text"
      });
    });

    it("updates the day correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day: "day",
        month: "month",
        year: "year"
      };
      rerender(false);
      dayTextField.props.onChange({target: {value: "changed"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "changed",
        month: "month",
        year: "year"
      });
    });

    it("updates the month correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day: "day",
        month: "month",
        year: "year"
      };
      rerender(false);
      monthTextField.props.onChange({target: {value: "changed"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "day",
        month: "changed",
        year: "year"
      });
    });

    it("updates the year correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day: "day",
        month: "month",
        year: "year"
      };
      rerender(false);
      yearTextField.props.onChange({target: {value: "changed"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "day",
        month: "month",
        year: "changed"
      });
    });
    
    it("updates the formatted date if month and year are valid and omitDay is true", () => {
      rerender(true);
      monthTextField.props.onChange({target: {value: "12"}});
      rerender(true);
      yearTextField.props.onChange({target: {value: "2077"}});

      assert.equal(that.props.profile.date_of_birth, "2077-12-01");
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "12",
        year: "2077",
        day: undefined
      });
    });

    it("updates the formatted date if day, month and year are valid and omitDay is false", () => {
      rerender(false);
      dayTextField.props.onChange({target: {value: "1"}});
      rerender(false);
      monthTextField.props.onChange({target: {value: "12"}});
      rerender(false);
      yearTextField.props.onChange({target: {value: "2077"}});

      assert.equal(that.props.profile.date_of_birth, "2077-12-01");
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "12",
        year: "2077",
        day: "1"
      });
    });

    it("stores text in date_of_birth_edit if it's not a valid date", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      monthTextField.props.onChange({target: {value: "13"}});
      rerender(false);

      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: 28,
        month: "13",
        year: 2066
      });
    });

    it("uses a day of 1 if omitDate is true", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(true);
      monthTextField.props.onChange({target: {value: "13"}});
      rerender(true);
      monthTextField.props.onChange({target: {value: "1"}});

      assert.deepEqual(that.props.profile.date_of_birth, "2066-01-01");
      // day is 28 here but it's discarded in the timestamp above, resulting in 01
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "1",
        year: 2066,
        day: 28
      });
    });

    it("uses validateDay for validation", () => {
      rerender(false);
      dayTextField.props.onChange({target: {value: "a day"}});
      assert(validateDaySpy.calledWith("a day"));
    });

    it("uses validateMonth for validation", () => {
      rerender(false);
      monthTextField.props.onChange({target: {value: "a month"}});
      assert(validateMonthSpy.calledWith("a month"));
    });

    it("uses validateYear for validation", () => {
      rerender(false);
      yearTextField.props.onChange({target: {value: "a year"}});
      assert(validateYearSpy.calledWith("a year"));
    });

    it("uses moment.js for validation", () => {
      rerender(false);
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      dayTextField.props.onChange({target: {value: "31"}});
      rerender(false);

      // Feb 31 is not a valid date, and only moment.js knows that
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "31",
        month: 2,
        year: 2066
      });
    });

    it("treats an empty date string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      dayTextField.props.onChange({target: {value: ""}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "",
        month: 2,
        year: 2066
      });
    });

    it("treats an empty month string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      monthTextField.props.onChange({target: {value: ""}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: 28,
        month: "",
        year: 2066
      });
    });

    it("treats an empty year string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      yearTextField.props.onChange({target: {value: ""}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: 28,
        month: 2,
        year: ""
      });
    });
  });

  describe('saveProfileStep', () => {
    const saveProfileReturnValue = "value";
    beforeEach(() => {
      that.props.saveProfile = sandbox.stub();
      that.props.saveProfile.returns(saveProfileReturnValue);
      that.props.profile.filled_out = false;
    });

    it('saves with finalStep as true', () => {
      let func = () => null;
      let ret = saveProfileStep.call(that, func, true);

      let clone = Object.assign({}, that.props.profile, {
        filled_out: true,
        email_optin: true
      });

      assert.ok(that.props.saveProfile.calledWith(
        func,
        clone,
        that.props.ui,
      ));
      assert.equal(ret, saveProfileReturnValue);
    });
  });
});
