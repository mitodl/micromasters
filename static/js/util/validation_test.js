import assert from 'assert';
import _ from 'lodash';

import {
  personalValidation,
  educationValidation,
  employmentValidation,
  privacyValidation,
} from './validation';
import {
  USER_PROFILE_RESPONSE,
  HIGH_SCHOOL,
} from '../constants';

describe('Profile validation functions', () => {
  describe('Personal validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual({}, personalValidation(USER_PROFILE_RESPONSE));
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = Object.assign({}, USER_PROFILE_RESPONSE);
      clone.first_name = '';
      assert.deepEqual({first_name: "Given name is required"}, personalValidation(clone));
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
});
