/* global SETTINGS: false */
import assert from 'assert';
import moment from 'moment';
import React from 'react';

import {
  STATUS_NOT_OFFERED,
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_OFFERED_NOT_ENROLLED,
  STATUS_VERIFIED_NOT_COMPLETED,
  USER_PROFILE_RESPONSE,
} from '../constants';
import {
  makeCourseStatusDisplay,
  makeCourseProgressDisplay,
  makeRunStatusDisplay,
  validateProfile,
  validateProfileComplete,
  makeStrippedHtml,
  makeProfileImageUrl,
  validateMonth,
  validateYear,
  validateDay,
  generateNewEducation,
  generateNewWorkHistory,
  getPreferredName,
  makeProfileProgressDisplay,
} from '../util/util';
import PersonalTab from '../components/PersonalTab';
import EmploymentTab from '../components/EmploymentTab';
import PrivacyTab from '../components/PrivacyTab';

/* eslint-disable camelcase */
describe('utility functions', () => {
  describe('makeStrippedHtml', () => {
    it('strips HTML from a string', () => {
      assert.equal(makeStrippedHtml("<a href='x'>y</a>"), "y");
    });
    it('strips HTML from a react element', () => {
      assert.equal(makeStrippedHtml(<div><strong>text</strong></div>), "text");
    });
  });

  describe("makeCourseStatusDisplay", () => {
    let yesterday = '2016-03-30';
    let today = '2016-03-31';
    let tomorrow = '2016-04-01';

    let renderCourseStatusDisplay = (course, ...args) => {
      if (course.runs === undefined) {
        course.runs = [];
      }
      let textOrElement = makeCourseStatusDisplay(course, ...args);
      return makeStrippedHtml(textOrElement);
    };

    it('is a passed course', () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_PASSED,
        runs: [{
          grade: 0.34
        }]
      }), "34%");
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_PASSED,
        runs: []
      }), "");
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_PASSED,
        runs: [{
          grade: null
        }]
      }), "");
    });

    it("is a failed course", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_NOT_OFFERED,
        runs: [{
          status: STATUS_NOT_PASSED,
          grade: 0.99999,
        }]
      }), "");
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_NOT_PASSED
      }), "");
    });

    it("is a verified course without a course start date", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_VERIFIED_NOT_COMPLETED,
        runs: []
      }), "");
    });

    it("is a verified course with a course start date of tomorrow", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_VERIFIED_NOT_COMPLETED,
        runs: [{
          course_start_date: tomorrow
        }]
      }, moment(today)), "Course starting: 4/1/2016");
    });

    it("is a verified course with a course start date of today", () => {
      // Note the lack of grade field
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_VERIFIED_NOT_COMPLETED,
        runs: [{
          course_start_date: today
        }]
      }, moment(today)), "0%");
    });

    it("is a verified course with a course start date of yesterday", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_VERIFIED_NOT_COMPLETED,
        runs: [{
          course_start_date: yesterday,
          grade: 0.33333
        }]
      }, moment(today)), "33%");
    });

    it("is an enrolled course with no verification date", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_ENROLLED_NOT_VERIFIED
      }, moment(today)), "");
    });

    it("is an enrolled course with a verification date of tomorrow", () => {
      assert.equal(
        renderCourseStatusDisplay({
          status: STATUS_ENROLLED_NOT_VERIFIED,
          runs: [{
            verification_date: tomorrow
          }]
        }, moment(today)),
        "UPGRADE TO VERIFIED"
      );
    });

    it("is an enrolled course with a verification date of today", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_ENROLLED_NOT_VERIFIED,
        runs: [{
          verification_date: today
        }]
      }, moment(today)), "");
    });

    it("is an enrolled course with a verification date of yesterday", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_ENROLLED_NOT_VERIFIED,
        runs: [{
          verification_date: yesterday
        }]
      }, moment(today)), "");
    });

    it("is an offered course with no enrollment start date", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_OFFERED_NOT_ENROLLED,
        runs: [{
          fuzzy_enrollment_start_date: "fuzzy start date"
        }]
      }), "fuzzy start date");
    });

    it("is an offered course with an enrollment date of tomorrow", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_OFFERED_NOT_ENROLLED,
        runs: [{
          enrollment_start_date: tomorrow
        }]
      }, moment(today)), "Enrollment starting: 4/1/2016");
    });

    it("is an offered course with an enrollment date of today", () => {
      assert.equal(
        renderCourseStatusDisplay({
          status: STATUS_OFFERED_NOT_ENROLLED,
          runs: [{
            enrollment_start_date: today
          }]
        }, moment(today)),
        "ENROLL"
      );
    });

    it("is an offered course with an enrollment date of yesterday", () => {
      assert.equal(
        renderCourseStatusDisplay({
          status: STATUS_OFFERED_NOT_ENROLLED,
          runs: [{
            enrollment_start_date: yesterday
          }]
        }, moment(today)),
        "ENROLL"
      );
    });

    it("doesn't show any special message even if the run is not passed", () => {
      // we do show this information in the progress circle and in the expander
      assert.equal(
        renderCourseStatusDisplay({
          status: STATUS_NOT_OFFERED,
          runs: [{
            status: STATUS_NOT_PASSED
          }]
        }, moment(today)),
        ""
      );
    });

    it("is a not offered course", () => {
      assert.equal(renderCourseStatusDisplay({
        status: STATUS_NOT_OFFERED
      }), "");
    });

    it("has a status we don't know about", () => {
      assert.equal(renderCourseStatusDisplay({
        status: "missing"
      }), "");
    });
  });

  describe("makeCourseStatusDisplay", () => {
    let passedCourse = {
      status: STATUS_PASSED,
      runs: []
    };
    let notPassedCourse = {
      status: STATUS_NOT_OFFERED,
      runs: [{
        status: STATUS_NOT_PASSED
      }]
    };
    let inProgressCourse = {
      status: STATUS_VERIFIED_NOT_COMPLETED
    };
    
    let renderCourseProgressDisplay = (course, isTop, isBottom, numRuns) => {
      if (numRuns === undefined) {
        numRuns = 0;
      }
      let textOrElement = makeCourseProgressDisplay(course, isTop, isBottom, numRuns);
      return makeStrippedHtml(textOrElement);
    };

    it('is a course which is passed', () => {
      assert.equal(
        renderCourseProgressDisplay(passedCourse),
        "Course passed"
      );
    });

    it('is a course which is in progress', () => {
      assert.equal(
        renderCourseProgressDisplay(inProgressCourse),
        "Course started"
      );
    });

    it('is a course which is not passed or in progress', () => {
      for (let status of [
        STATUS_NOT_PASSED,
        STATUS_ENROLLED_NOT_VERIFIED,
        STATUS_OFFERED_NOT_ENROLLED,
        STATUS_NOT_OFFERED,
      ]) {
        assert.equal(
          renderCourseProgressDisplay({
            status: status,
            runs: []
          }),
          "Course not started"
        );
      }
    });

    it('is a course which is not-passed', () => {
      assert.equal(
        renderCourseProgressDisplay(notPassedCourse),
        "Course not started"
      );
    });
    
    let getLines = progress => {
      let topLine = false, bottomLine = false;

      for (let child of progress.props.children) {
        if (React.isValidElement(child)) {
          if (child.props.className === "top-line") {
            topLine = true;
          }
          if (child.props.className === "bottom-line") {
            bottomLine = true;
          }
        }
      }

      return [topLine, bottomLine];
    };

    it('draws lines going up and down correctly', () => {
      for (let isFirst of [true, false]) {
        for (let isLast of [true, false]) {
          let progress = makeCourseProgressDisplay(passedCourse, isFirst, isLast, 10);
          let lines = getLines(progress);
          assert.deepEqual(lines, [!isFirst, !isLast]);
        }
      }
    });
  });

  describe("makeRunStatusDisplay", () => {
    it('shows Course passed when a course is passed', () => {
      assert.equal("Passed", makeRunStatusDisplay({ status: STATUS_PASSED }));
    });

    it('shows Course not passed when a course is not passed', () => {
      assert.equal("Not passed", makeRunStatusDisplay({ status: STATUS_NOT_PASSED }));
    });

    it('returns an empty string for all other statuses', () => {
      for (let status of [
        STATUS_ENROLLED_NOT_VERIFIED,
        STATUS_NOT_OFFERED,
        STATUS_OFFERED_NOT_ENROLLED,
        STATUS_VERIFIED_NOT_COMPLETED,
      ]) {
        assert.equal("", makeRunStatusDisplay({ status: status }));
      }
    });
  });

  describe("validateProfile", () => {
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
      ['date_of_birth'],
    ];

    let messages = {
      'first_name': 'First Name',
      'last_name': 'Last Name',
      'preferred_name': 'Preferred Name',
      'gender': 'Gender',
      'preferred_language': 'Preferred language',
      'city': 'City',
      'country': 'Country',
      'birth_city': 'Birth City',
      'birth_country': 'Birth Country',
      'date_of_birth': 'Birth Date',
    };

    it('validates the test profile successfully', () => {
      let errors = validateProfile(USER_PROFILE_RESPONSE, requiredFields, messages);
      assert.deepEqual(errors, {});
    });

    it('validates required fields', () => {
      let profile = {};
      for (let key of requiredFields) {
        profile[key[0]] = '';
      }

      let errors = validateProfile(profile, requiredFields, messages);
      for (let key of requiredFields) {
        let error = errors[key];
        assert.ok(error.indexOf("is required") !== -1);
      }
    });

    it('validates nested fields', () => {
      let profile = {
        nested_array: [{foo: "bar", baz: null}]
      };
      const keysToCheck = [
        ["nested_array", 0, "foo"],
        ["nested_array", 0, "baz"],
      ];
      const nestMessages = {"baz": "Baz"};
      let errors = validateProfile(profile, keysToCheck, nestMessages);
      assert.deepEqual({nested_array: [ { baz: "Baz is required" } ] }, errors);
    });

    it('correctly validates fields with 0', () => {
      let profile = {
        nested_array: [{foo: 0}]
      };
      const keysToCheck = [
        ["nested_array", 0, "foo"]
      ];
      const nestMessages = {"foo": "Foo"};
      let errors = validateProfile(profile, keysToCheck, nestMessages);
      assert.deepEqual({}, errors);
    });
  });

  describe('validateProfileComplete', () => {
    let profile;
    beforeEach(() => {
      profile = {};
    });

    it('should return fields for an empty profile', () => {
      let errors = Object.assign({}, ...Object.entries(PersonalTab.defaultProps.validationMessages).map(
        ([k,v]) => ({[k]: `${v} is required`})
      ));
      const expectation = [false, "/profile/personal", errors];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });

    it('should return appropriate fields for dialog when a field is missing', () => {
      PersonalTab.defaultProps.requiredFields.forEach( (field) => {
        profile[field[0]] = "filled in";
      });
      profile['account_privacy'] = '';
      let expectation = [false, "/profile/privacy", {
        account_privacy: 'Privacy level is required'
      }];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });

    it('should return true when all top-level fields are filled in', () => {
      PersonalTab.defaultProps.requiredFields.forEach( (field) => {
        profile[field[0]] = "filled in";
      });
      PrivacyTab.defaultProps.requiredFields.forEach( (field) => {
        profile[field[0]] = "filled in";
      });
      assert.deepEqual(validateProfileComplete(profile), [true, null, null]);
    });

    it('should return true when all nested fields are filled in', () => {
      PersonalTab.defaultProps.requiredFields.forEach( (field) => {
        profile[field[0]] = "filled in";
      });
      PrivacyTab.defaultProps.requiredFields.forEach( (field) => {
        profile[field[0]] = "filled in";
      });
      profile['work_history'] = [{}];
      EmploymentTab.nestedValidationKeys.forEach( k => {
        profile['work_history'][0][k] = "filled in";
      });
      assert.deepEqual(validateProfileComplete(profile), [true, null, null]);
    });

    it('should return fields for dialog when a nested field is missing', () => {
      PersonalTab.defaultProps.requiredFields.forEach( (field) => {
        profile[field[0]] = "filled in";
      });
      profile['work_history'] = [{}];
      EmploymentTab.nestedValidationKeys.forEach( k => {
        profile['work_history'][0][k] = "filled in";
      });
      profile['work_history'][0]['country'] = '';
      let expectation = [false, "/profile/professional", {
        work_history: [{country: "Country is required"}]
      }];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });
  });

  describe('validateMonth', () => {
    it('handles months starting with 0 without treating as octal', () => {
      assert.equal(9, validateMonth("09"));
    });
    it('converts strings to numbers', () => {
      assert.equal(3, validateMonth("3"));
    });
    it('returns undefined for invalid months', () => {
      assert.equal(undefined, validateMonth("-3"));
      assert.equal(undefined, validateMonth("0"));
      assert.equal(1, validateMonth("1"));
      assert.equal(12, validateMonth("12"));
      assert.equal(undefined, validateMonth("13"));
    });
    it('returns undefined if the text is not an integer number', () => {
      assert.equal(undefined, validateMonth(""));
      assert.equal(undefined, validateMonth("two"));
      assert.equal(undefined, validateMonth(null));
      assert.equal(undefined, validateMonth({}));
      assert.equal(undefined, validateMonth(undefined));
      assert.equal(undefined, validateMonth("2e0"));
      assert.equal(undefined, validateMonth("3-4"));
      assert.equal(undefined, validateMonth("3.4"));
    });
  });

  describe('validateYear', () => {
    it('handles years starting with 0 without treating as octal', () => {
      assert.equal(999, validateYear("0999"));
    });
    it('converts strings to numbers', () => {
      assert.equal(3, validateYear("3"));
    });
    it('returns undefined for invalid years', () => {
      assert.equal(undefined, validateYear("-3"));
      assert.equal(undefined, validateYear("0"));
      assert.equal(1, validateYear("1"));
      assert.equal(9999, validateYear("9999"));
      assert.equal(undefined, validateYear("10000"));
    });
    it('returns undefined if the text is not an integer number', () => {
      assert.equal(undefined, validateYear(""));
      assert.equal(undefined, validateYear("two"));
      assert.equal(undefined, validateYear(null));
      assert.equal(undefined, validateYear({}));
      assert.equal(undefined, validateYear(undefined));
      assert.equal(undefined, validateYear("2e0"));
      assert.equal(undefined, validateYear("3-4"));
      assert.equal(undefined, validateYear("3.4"));
    });
  });
  
  describe('validateDate', () => {
    it('handles dates starting with 0 without treating as octal', () => {
      assert.equal(1, validateDay("01"));
    });
    it('converts strings to numbers', () => {
      assert.equal(3, validateDay("3"));
    });
    it('returns undefined for invalid dates', () => {
      assert.equal(undefined, validateDay("-3"));
      assert.equal(undefined, validateDay("0"));
      assert.equal(1, validateDay("1"));
      assert.equal(31, validateDay("31"));
      assert.equal(undefined, validateDay("32"));
    });
    it('returns undefined if the text is not an integer number', () => {
      assert.equal(undefined, validateDay(""));
      assert.equal(undefined, validateDay("two"));
      assert.equal(undefined, validateDay(null));
      assert.equal(undefined, validateDay({}));
      assert.equal(undefined, validateDay(undefined));
      assert.equal(undefined, validateDay("2e0"));
      assert.equal(undefined, validateDay("3-4"));
      assert.equal(undefined, validateDay("3.4"));
    });
  });

  describe('generateNewWorkHistory', () => {
    it('generates a new work history object', () => {
      assert.deepEqual(generateNewWorkHistory(), {
        position: null,
        industry: null,
        company_name: null,
        start_date: null,
        end_date: null,
        city: null,
        country: null,
        state_or_territory: null,
      });
    });
  });
  
  describe('generateNewEducation', () => {
    it('generates a new education object', () => {
      let level = 'level';
      assert.deepEqual(generateNewEducation(level), {
        'degree_name': level,
        'graduation_date': null,
        'field_of_study': null,
        'online_degree': false,
        'school_name': null,
        'school_city': null,
        'school_state_or_territory': null,
        'school_country': null
      });
    });
  });

  describe('makeProfileImageUrl', () => {
    it('uses the large profile image if available', () => {
      let url = "/url";
      assert.equal(url, makeProfileImageUrl({ profile_url_large: url }));
    });
    
    it('uses a default profile image if not available, removing duplicate slashes', () => {
      assert.equal(
        `${SETTINGS.edx_base_url}static/images/profiles/default_120.png`,
        makeProfileImageUrl({})
      );
    });
  });

  describe('getPreferredName', () => {
    let settingsBackup;
    beforeEach(() => {
      settingsBackup = Object.assign({}, SETTINGS);
    });

    afterEach(() => {
      Object.assign(SETTINGS, settingsBackup);
    });

    it('shows profile.preferred_name', () => {
      assert.equal('profile preferred name', getPreferredName({
        preferred_name: 'profile preferred name'
      }));
    });

    it('uses SETTINGS.name if profile.preferred_name is not available', () => {
      assert.equal(SETTINGS.name, getPreferredName({}));
    });

    it('uses SETTINGS.username if SETTINGS.name and profile.preferred_name are not available', () => {
      SETTINGS.name = '';
      assert.equal(SETTINGS.username, getPreferredName({}));
    });
  });

  describe('makeProfileProgressDisplay', () => {
    it('renders the right active display', () => {
      let expected = ["Personal", "Education", "Professional", "Profile Privacy"];

      for (let i = 0; i < expected.length; ++i) {
        let svg = makeProfileProgressDisplay(i);
        let desc = svg.props.children[0];
        assert.equal(desc.props.children.join(""), `Profile progress: ${expected[i]}`);

        for (let child of svg.props.children) {
          if (child.key === `circle_${i}`) {
            // the white circle should be the currently selected one
            assert.equal(child.props.fill, "white");
          }
          if (child.key === `circletext_${i}`) {
            assert.equal(child.props.children, `${i + 1}`);
          }
          if (child.key === `text_${i}`) {
            assert.equal(child.props.children, expected[i]);
          }
        }
      }
    });
  });
});
