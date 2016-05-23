import React from 'react';
import assert from 'assert';
import iso3166 from 'iso-3166-2';
import _ from 'lodash';
import moment from 'moment';
import MenuItem from 'material-ui/MenuItem';
import sinon from 'sinon';

import {
  boundTextField,
  boundDateField,
  boundSelectField,
  boundStateSelectField,
  boundCountrySelectField,
  boundMonthYearField,
} from './profile_edit';
import { DATE_FORMAT } from '../constants';
import { USER_PROFILE_RESPONSE } from '../constants';
import * as profileEdit from '../util/profile_edit';
import * as util from '../util/util';

describe('Profile Editing utility functions', () => {
  let that;
  const change = (clone) => that.props.profile = clone;
  beforeEach(() => {
    that = {
      props: {
        profile: {
          "first_name": "",
          "date_of_birth": "",
          "gender": undefined,
          "date_field": ""
        },
        errors: {
          "first_name": "First name is required",
          "date_of_birth": "Date of birth is required",
          "gender": "Gender is required",
          "date_field": "Date field is required"
        },
        updateProfile: change
      }
    };
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

  describe('Bound Date field', () => {
    let dateField, dateElement, errorText;
    beforeEach(() => {
      dateField = boundDateField.call(
        that,
        ["date_of_birth"],
        "Date of birth"
      );
      dateElement = dateField.props.children[0];
      errorText = dateField.props.children[1];
    });

    it('should correctly set props on itself', () => {
      assert.equal('Date of birth', dateElement.props.placeholderText);
      assert.equal(errorText.type, 'span');
      assert.deepEqual({
        className: 'validation-error-text',
        children: "Date of birth is required",
      }, errorText.props);
    });

    it('should call the updateProfile callback when onChange fires', () => {
      let cur = moment();
      dateElement.props.onChange(cur);
      assert.deepEqual(cur.format(DATE_FORMAT), that.props.profile.date_of_birth);
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
  });

  describe("Bound state select field", () => {
    let sandbox, boundSelectFieldSpy;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();

      boundSelectFieldSpy = sandbox.spy(profileEdit, 'boundSelectField');
    });

    afterEach(() => {
      sandbox.restore();
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
    let sandbox, boundSelectFieldSpy, countryOptions;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();

      boundSelectFieldSpy = sandbox.spy(profileEdit, 'boundSelectField');

      countryOptions = Object.keys(iso3166.data).map(code => ({
        value: code,
        label: iso3166.data[code]['name']
      }));
      countryOptions = _.sortBy(countryOptions, 'label');
    });

    afterEach(() => {
      sandbox.restore();
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
        profile = newProfile
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

  describe("Bound month/year field", () => {
    let monthYearField, monthTextField, yearTextField, errorSpan, labelField;
    let sandbox, validateYearSpy, validateMonthSpy;
    let __; // eslint-disable-line no-unused-vars
    let renderMonthYearField = () => {
      monthYearField = boundMonthYearField.call(
        that,
        ["date_of_birth"],
        "Date of birth"
      );

      return monthYearField.props.children.filter(React.isValidElement);
    };

    beforeEach(() => {
      [labelField, __, monthTextField, __, yearTextField, errorSpan] = renderMonthYearField();

      sandbox = sinon.sandbox.create();

      validateYearSpy = sandbox.spy(util, 'validateYear');
      validateMonthSpy = sandbox.spy(util, 'validateMonth');
    });

    afterEach(() => {
      sandbox.restore();
    });


    it("has proper props for an invalid or missing value", () => {
      for (let dateOfBirth of ['', {}, null, undefined]) {
        that.props.profile.date_of_birth = dateOfBirth;
        [labelField, __, monthTextField, __, yearTextField, errorSpan] = renderMonthYearField();

        assert.equal(labelField.props.children, "Date of birth");
        assert.equal(monthTextField.props.floatingLabelText, "MM");
        assert.equal(monthTextField.props.value, "");
        assert.equal(yearTextField.props.floatingLabelText, "YYYY");
        assert.equal(yearTextField.props.value, "");
        assert.equal(errorSpan.props.children, "Date of birth is required");
      }
    });

    it("has proper props for a defined valid value", () => {
      that.props.profile.date_of_birth = "1985-12-31";
      [labelField, __, monthTextField, __, yearTextField, errorSpan] = renderMonthYearField();

      assert.equal(labelField.props.children, "Date of birth");
      assert.equal(monthTextField.props.floatingLabelText, "MM");
      assert.equal(monthTextField.props.value, 12);
      assert.equal(yearTextField.props.floatingLabelText, "YYYY");
      assert.equal(yearTextField.props.value, 1985);
      assert.equal(errorSpan.props.children, "Date of birth is required");
    });

    it("updates the month edit value when the month TextField onChange is used", () => {
      monthTextField.props.onChange({target: {value: "text"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "text",
        year: undefined
      });
    });

    it("updates the year edit value when the year TextField onChange is used", () => {
      yearTextField.props.onChange({target: {value: "text"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: undefined,
        year: "text"
      });
    });

    it("updates the month correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        month: "month",
        year: "year"
      };
      monthTextField.props.onChange({target: {value: "changed"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "changed",
        year: "year"
      });
    });

    it("updates the year correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        month: "month",
        year: "year"
      };
      yearTextField.props.onChange({target: {value: "changed"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "month",
        year: "changed"
      });
    });
    
    it("updates the formatted date if month and year are valid", () => {
      monthTextField.props.onChange({target: {value: "12"}});
      [labelField, __, monthTextField, __, yearTextField, errorSpan] = renderMonthYearField();

      yearTextField.props.onChange({target: {value: "2077"}});

      assert.equal(that.props.profile.date_of_birth, "2077-12-01");
      assert.deepEqual(that.props.profile.date_of_birth_edit, undefined);
    });

    it("stores text in date_of_birth_edit if it's not a valid date", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      [labelField, __, monthTextField, __, yearTextField, errorSpan] = renderMonthYearField();
      monthTextField.props.onChange({target: {value: "13"}});
      [labelField, __, monthTextField, __, yearTextField, errorSpan] = renderMonthYearField();

      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: "13",
        year: "2066"
      });
    });

    it("uses validateMonth for validation", () => {
      monthTextField.props.onChange({target: {value: "a month"}});
      assert(validateMonthSpy.calledWith("a month"));
    });

    it("uses validateYear for validation", () => {
      yearTextField.props.onChange({target: {value: "a year"}});
      assert(validateYearSpy.calledWith("a year"));
    });
  });
});
