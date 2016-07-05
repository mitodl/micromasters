import React from 'react';
import { assert } from 'chai';
import sinon from 'sinon';

import {
  boundTextField,
  boundDateField,
  boundRadioGroupField,
  saveProfileStep,
} from './profile_edit';
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

    it('left pads month and day values when not editing', () => {
      that.props.profile.date_of_birth = "1917-01-07";
      rerender(false);
      assert.equal(monthTextField.props.value, '01');
      assert.equal(dayTextField.props.value, '07');
    });

    it('does not left pad month and day values when editing is in progress', () => {
      that.props.profile.date_of_birth = "1917-01-07";
      rerender(false);
      monthTextField.props.onChange({target: {value: "2"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        month: '2',
        year: '1917',
        day: '7'
      });
    });

    it('rejects non-numerical input for the month field', () => {
      that.props.profile.date_of_birth = "1917-11-07";
      rerender(false);
      monthTextField.props.onChange({target: {value: "text"}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "7",
        month: "",
        year: "1917",
      });
    });

    it('accepts numerical input for the month field', () => {
      that.props.profile.date_of_birth = "1917-11-07";
      rerender(false);
      monthTextField.props.onChange({target: {value: "08"}});
      assert.deepEqual(that.props.profile.date_of_birth, "1917-08-07");
    });

    it('rejects non-numerical input for the year field', () => {
      that.props.profile.date_of_birth = "1917-11-07";
      rerender(false);
      yearTextField.props.onChange({target: {value: "text"}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "7",
        month: "11",
        year: "",
      });
    });

    it('accepts numerical input for the year field', () => {
      that.props.profile.date_of_birth = "1917-11-07";
      rerender(false);
      yearTextField.props.onChange({target: {value: "1918"}});
      assert.deepEqual(that.props.profile.date_of_birth, "1918-11-07");
    });

    it('only accepts inputs that are valid months, converting when necessary', () => {
      that.props.profile.date_of_birth = "1917-11-07";
      rerender(false);
      monthTextField.props.onChange({target: {value: "233"}});
      assert.deepEqual(that.props.profile.date_of_birth, "1917-12-07");
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "7",
        month: "12",
        year: "1917",
      });
    });

    it('only accepts years in the range 1800-2100, correcting up or down', () => {
      that.props.profile.date_of_birth = "1917-11-07";
      rerender(false);
      yearTextField.props.onChange({target: {value: "1233"}});
      assert.deepEqual(that.props.profile.date_of_birth, "1800-11-07");
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "7",
        month: "11",
        year: "1800",
      });

      that.props.profile.date_of_birth = "1917-11-07";
      rerender(false);
      yearTextField.props.onChange({target: {value: "3000"}});
      assert.deepEqual(that.props.profile.date_of_birth, "2100-11-07");
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "7",
        month: "11",
        year: "2100",
      });
    });

    it("updates the day edit value when the day TextField onChange is used", () => {
      rerender(false);
      dayTextField.props.onChange({target: {value: "12"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "12",
        month: "",
        year: "",
      });
    });

    it("updates the month edit value when the month TextField onChange is used", () => {
      rerender(false);
      monthTextField.props.onChange({target: {value: "12"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "",
        month: "12",
        year: ""
      });
    });

    it("updates the year edit value when the year TextField onChange is used", () => {
      rerender(false);
      yearTextField.props.onChange({target: {value: "1992"}});

      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "",
        month: "",
        year: "1992"
      });
    });

    it("updates the day correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day: "15",
        month: "8",
        year: "1991"
      };
      rerender(false);
      dayTextField.props.onChange({target: {value: "11"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "11",
        month: "8",
        year: "1991"
      });
    });

    it("updates the month correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day: "09",
        month: "11",
        year: "1965"
      };
      rerender(false);
      monthTextField.props.onChange({target: {value: "8"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "9",
        month: "8",
        year: "1965"
      });
    });

    it("updates the year correctly when edit value already exists", () => {
      that.props.profile.date_of_birth_edit = {
        day: "09",
        month: "11",
        year: "1965"
      };
      rerender(false);
      yearTextField.props.onChange({target: {value: "1991"}});
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "9",
        month: "11",
        year: "1991"
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
      monthTextField.props.onChange({target: {value: "MONTH"}});
      rerender(false);

      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "28",
        month: "",
        year: "2066"
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
        year: "2066",
        day: "28"
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
        month: "2",
        year: "2066"
      });
    });

    it("treats an empty date string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      dayTextField.props.onChange({target: {value: ""}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "",
        month: "2",
        year: "2066"
      });
    });

    it("treats an empty month string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      monthTextField.props.onChange({target: {value: ""}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "28",
        month: "",
        year: "2066"
      });
    });

    it("treats an empty year string as deleting the format text but not edit data", () => {
      that.props.profile.date_of_birth = "2066-02-28";
      rerender(false);
      yearTextField.props.onChange({target: {value: ""}});
      assert.deepEqual(that.props.profile.date_of_birth, null);
      assert.deepEqual(that.props.profile.date_of_birth_edit, {
        day: "28",
        month: "2",
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
