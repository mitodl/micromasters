import { assert } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';
import moment from 'moment';

import {
  personalValidation,
  educationValidation,
  educationUiValidation,
  employmentValidation,
  employmentUiValidation,
  privacyValidation,
  validateProfileComplete,
  validateDay,
  validateMonth,
  validateYear,
  combineValidators,
  sanitizeDate,
} from './validation';
import {
  USER_PROFILE_RESPONSE,
  EDUCATION_LEVELS,
  BACHELORS,
  HIGH_SCHOOL,
  PERSONAL_STEP,
  EMPLOYMENT_STEP,
  PRIVACY_STEP,
} from '../constants';
import { INITIAL_UI_STATE } from '../reducers/ui';

describe('Profile validation functions', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('Personal validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual({}, personalValidation(USER_PROFILE_RESPONSE));
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = Object.assign({}, USER_PROFILE_RESPONSE);
      clone.first_name = '';
      assert.deepEqual({first_name: "Given name is required"}, personalValidation(clone));
    });

    it('validates required fields', () => {
      let requiredFields = [
        ['first_name'],
        ['last_name'],
        ['preferred_name'],
        ['gender'],
        ['preferred_language'],
        ['city'],
        ['country'],
        ['birth_city'],
        ['birth_country'],
      ];

      let profile = {};
      for (let key of requiredFields) {
        profile[key[0]] = '';
      }

      let errors = personalValidation(profile);
      for (let key of requiredFields) {
        let error = errors[key];
        assert.ok(error.indexOf("is required") !== -1);
      }
    });

    it('correctly validates fields with 0', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.first_name = 0;
      let errors = personalValidation(profile);
      assert.deepEqual({}, errors);
    });

    it('should error if date of birth is in the future', () => {
      let profile = Object.assign({}, USER_PROFILE_RESPONSE, {
        date_of_birth: "2077-01-01"
      });
      let errors = {
        date_of_birth: "Please enter a valid date of birth"
      };
      assert.deepEqual(personalValidation(profile), errors);
    });
  });

  describe('Education validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual({}, educationValidation(USER_PROFILE_RESPONSE));
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education[0].school_name = '';
      let expectation = {education: [{school_name: 'School name is required'}]};
      assert.deepEqual(expectation, educationValidation(clone));
    });

    it('should return an empty object if no education present', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education = undefined;
      assert.deepEqual({}, educationValidation(clone));
    });

    it('should not validate field_of_study for high school students', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education[0].degree_name = HIGH_SCHOOL;
      clone.education[0].field_of_study = "";
      assert.deepEqual({}, educationValidation(clone));
    });

    it('should show all fields which are required', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education[0].school_name = '';
      clone.education[0].school_city = '';
      assert.deepEqual({
        education: [{
          school_name: 'School name is required',
          school_city: 'City is required'
        }]
      }, educationValidation(clone));
    });

    it('should complain about switches being on if there are no elements in the list', () => {
      let profile = Object.assign({}, USER_PROFILE_RESPONSE, {
        education: [{
          degree_name: BACHELORS
        }]
      });
      let ui = Object.assign({}, INITIAL_UI_STATE);
      ui.educationDegreeInclusions[HIGH_SCHOOL] = true;
      ui.educationDegreeInclusions[BACHELORS] = true;

      let errors = educationUiValidation(profile, ui);
      let highSchoolLabel = EDUCATION_LEVELS.find(education => education.value === HIGH_SCHOOL).label;
      assert.deepEqual(errors, {
        [`education_${HIGH_SCHOOL}_required`]:
          `${highSchoolLabel} is required if switch is on. Please add a degree or switch it off.`
      });
    });
  });

  describe('Employment validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual({}, employmentValidation(USER_PROFILE_RESPONSE));
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.work_history[0].company_name = '';
      let expectation = {work_history: [{company_name: 'Company Name is required'}]};
      assert.deepEqual(expectation, employmentValidation(clone));
    });

    it('should return an empty object if no employment present', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.work_history = undefined;
      assert.deepEqual({}, employmentValidation(clone));
    });

    it('should show all fields which are required', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.work_history[0].company_name = '';
      clone.work_history[0].city = '';
      assert.deepEqual({
        work_history: [{
          city: 'City is required',
          company_name: 'Company Name is required'
        }]
      }, employmentValidation(clone));
    });

    it('should complain about the switch being on if there are no elements in the list', () => {
      let profile = Object.assign({}, USER_PROFILE_RESPONSE, {
        work_history: []
      });
      let ui = Object.assign({}, INITIAL_UI_STATE, {
        workHistoryEdit: true
      });

      let errors = employmentUiValidation(profile, ui);
      assert.deepEqual(errors, {
        work_history_required: `Work history is required if switch is on. Please add work history or switch it off.`
      });
    });

    it('should reject end date before start date', () => {
      let errors = {
        work_history: [, // eslint-disable-line no-sparse-arrays
          {
            end_date: "End date cannot be before start date"
          }
        ]
      };
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = moment(profile.work_history[1].start_date).subtract(1, 'months');
      assert.deepEqual(errors, employmentValidation(profile));
    });

    it('should not error if end_date is blank', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = null;
      assert.deepEqual({}, employmentValidation(profile));
    });


    for (let field of ['year', 'month']) {
      let errors = {
        work_history: [, // eslint-disable-line no-sparse-arrays
          {
            end_date: "Please enter a valid end date or leave it blank"
          }
        ]
      };

      it(`should error if end_date has an edit value in ${field}`, () => {
        let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
        profile.work_history[1].end_date = null;
        profile.work_history[1].end_date_edit = Object.assign({
          year: "",
          month: ""
        }, {
          [field]: "field"
        });
        assert.deepEqual(errors, employmentValidation(profile));
      });
    }

    it(`should error if end_date has a number in year`, () => {
      let errors = {
        work_history: [, // eslint-disable-line no-sparse-arrays
          {
            end_date: "Please enter a valid end date or leave it blank"
          }
        ]
      };
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = null;
      profile.work_history[1].end_date_edit = {
        year: 1943,
        month: ""
      };
      assert.deepEqual(errors, employmentValidation(profile));
    });

    it('should not error if end_date has an edit value which is blank', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = null;
      profile.work_history[1].end_date_edit = {
        year: "",
        month: ""
      };
      assert.deepEqual({}, employmentValidation(profile));
    });
  });

  describe('Privacy validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual({}, privacyValidation(USER_PROFILE_RESPONSE));
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = Object.assign({}, USER_PROFILE_RESPONSE, {account_privacy: ''});
      let expectation = {account_privacy: 'Privacy level is required'};
      assert.deepEqual(expectation, privacyValidation(clone));
    });
  });

  describe('validateProfileComplete', () => {
    let profile;
    beforeEach(() => {
      profile = {};
    });

    it('should return fields for an empty profile', () => {
      let errors = Object.assign({}, ...Object.entries({
        'first_name': "Given name",
        'last_name': "Family name",
        'preferred_name': "Preferred name",
        'gender': "Gender",
        'preferred_language': "Preferred language",
        'city': "City",
        'state_or_territory': 'State or Territory',
        'country': "Country",
        'birth_city': 'City',
        'birth_state_or_territory': 'State or Territory',
        'birth_country': "Country",
      }).map(([k,v]) => ({[k]: `${v} is required`})));
      errors.date_of_birth = "Please enter a valid date of birth";
      const expectation = [false, PERSONAL_STEP, errors];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });

    it('should return appropriate fields when a field is missing', () => {
      profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile['account_privacy'] = '';
      let expectation = [false, PRIVACY_STEP, {
        account_privacy: 'Privacy level is required'
      }];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });

    it('should return true when all fields are filled in', () => {
      assert.deepEqual(validateProfileComplete(USER_PROFILE_RESPONSE), [true, null, null]);
    });

    it('should return fields for dialog when a nested field is missing', () => {
      profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      _.set(profile, ['work_history', 0, 'country'], '');
      let expectation = [false, EMPLOYMENT_STEP, {
        work_history: [{country: "Country is required"}]
      }];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });
  });

  describe('sanitizeDate', () => {
    describe('string input', () => {
      it('should remove any non-numerical characters', () => {
        [
          ['-', 2, ''],
          ['-32', 2, '32'],
          ['asdf', 19, ''],
          ['A(*@$%!@#$100', 2, '10'],
          ['eggplant 1X00 hey', 10, '100']
        ].forEach(([input, length, expectation]) => {
          assert.deepEqual(sanitizeDate(input, length), expectation);
        });
      });

      it('should trim the input down to the desired length', () => {
        [
          ['1999', 2, '19'],
          ['1x9', 2, '19'],
          ['1', 4, '1'],
          ['', 18318, ''],
          ['TESTS', 25, ''],
          ['1991', 0, '']
        ].forEach(([input, length, expectation]) => {
          assert.deepEqual(sanitizeDate(input, length), expectation);
        });
      });

      it('should leave leading zeros when under the length', () => {
        assert.equal(sanitizeDate('09', 2), '09');
      });

      it('should remove leading zeros when over the length', () => {
        assert.equal(sanitizeDate('01999', 4), '1999');
      });
    });

    describe('numerical input', () => {
      it('should return a string', () => {
        assert.deepEqual(sanitizeDate(3, 1), '3');
      });

      it('should trim a number down to the correct number of places', () => {
        [
          [1999, 4, '1999'],
          [1999, 2, '19'],
          [112341234, 1, '1']
        ].forEach(([input, length, expectation]) => {
          assert.deepEqual(sanitizeDate(input, length), expectation);
        });
      });
    });
  });

  describe('validateMonth', () => {
    it('handles months starting with 0 without treating as octal', () => {
      assert.equal(9, validateMonth("09"));
    });

    it('converts strings to numbers', () => {
      for (let i = 1; i < 13; i++) {
        assert.equal(i, validateMonth(String(i)));
      }
    });

    it('strips out any non-numerical characters', () => {
      assert.equal(12, validateMonth("1e2"));
      assert.equal(4, validateMonth("0-4"));
      assert.equal(3, validateMonth("-3"));
    });

    it('returns 12 for any number >= 12', () => {
      assert.equal(12, validateMonth("3.4"));
      assert.equal(12, validateMonth("13"));
    });

    it('will let a user input a leading zero', () => {
      assert.equal(0, validateMonth("0"));
      assert.equal(8, validateMonth("08"));
    });

    it('returns undefined if the text is not an integer number', () => {
      assert.equal(undefined, validateMonth(""));
      assert.equal(undefined, validateMonth("two"));
      assert.equal(undefined, validateMonth(null));
      assert.equal(undefined, validateMonth({}));
      assert.equal(undefined, validateMonth(undefined));
    });
  });

  describe('validateYear', () => {
    it('handles years starting with 0 without treating as octal', () => {
      assert.equal(1999, validateYear("01999"));
    });
    it('converts strings to numbers', () => {
      assert.equal(1943, validateYear("1943"));
    });

    it('strips non-numerical characters', () => {
      assert.equal(2004, validateYear("2e004"));
      assert.equal(2034, validateYear("203-4"));
    });
    it('returns values for years less than 1800 if they are less than 4 character', () => {
      assert.equal(3, validateYear("3"));
      assert.equal(703, validateYear("703"));
      assert.equal(0, validateYear("0"));
      assert.equal(20, validateYear("-20"));
    });
    it('returns 1800 for 4-character years less than 1800', () => {
      assert.equal(1800, validateYear("1799"));
      assert.equal(1800, validateYear("1099"));
    });
    it('returns 2100 for years >= 2100', () => {
      assert.equal(2100, validateYear("2100"));
      assert.equal(2100, validateYear("2300"));
      assert.equal(2100, validateYear("52300"));
    });
    it('returns undefined if the text is not an integer number', () => {
      assert.equal(undefined, validateYear(""));
      assert.equal(undefined, validateYear("two"));
      assert.equal(undefined, validateYear(null));
      assert.equal(undefined, validateYear("@#"));
      assert.equal(undefined, validateYear({}));
      assert.equal(undefined, validateYear(undefined));
    });
  });

  describe('validateDay', () => {
    it('handles dates starting with 0 without treating as octal', () => {
      assert.equal(1, validateDay("01"));
    });
    it('converts strings to numbers', () => {
      assert.equal(3, validateDay("3"));
    });
    it("allows leading zeros", () => {
      assert.equal(0, validateDay("0"));
      assert.equal(1, validateDay("01"));
    });
    it('disallows non-numerical input', () => {
      assert.equal(3, validateDay("-3"));
      assert.equal(20, validateDay("2e0"));
      assert.equal(21, validateDay("2-1"));
      assert.equal(22, validateDay("2.2"));
    });
    it('returns 31 for dates greater than 31', () => {
      assert.equal(31, validateDay("32"));
      assert.equal(31, validateDay("71"));
    });
    it('truncates to the first 2 characters of input', () => {
      assert.equal(22, validateDay("220"));
    });
    it('returns undefined if the text is not an integer number', () => {
      assert.equal(undefined, validateDay(""));
      assert.equal(undefined, validateDay("two"));
      assert.equal(undefined, validateDay(null));
      assert.equal(undefined, validateDay({}));
      assert.equal(undefined, validateDay(undefined));
    });
  });

  describe('combineValidators', () => {
    it('uses _.merge on the output of a series of functions', () => {
      let mergeStub = sandbox.stub(_, 'merge');
      const mergeResult = "mergeResult";
      mergeStub.returns(mergeResult);
      const args = ["some", "args"];

      let func1 = sandbox.stub().returns("ret1");
      let func2 = sandbox.stub().returns("ret2");

      let result = combineValidators(func1, func2)(args);
      assert(func1.calledWith(args));
      assert(func2.calledWith(args));
      assert(mergeStub.calledWith({}, "ret1", "ret2"));
      assert.equal(result, mergeResult);
    });
  });
});
