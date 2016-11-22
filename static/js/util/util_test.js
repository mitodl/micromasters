/* global SETTINGS: false */
import { assert } from 'chai';
import React from 'react';
import R from 'ramda';
import _ from 'lodash';
import { S } from '../lib/sanctuary';
const { Just } = S;

import {
  makeStrippedHtml,
  makeProfileImageUrl,
  generateNewEducation,
  generateNewWorkHistory,
  getPreferredName,
  makeProfileProgressDisplay,
  userPrivilegeCheck,
  calculateDegreeInclusions,
  callFunctionArray,
  getLocation,
  validationErrorSelector,
  asPercent,
  getEmployer,
  createForm,
  formatPrice,
  programCourseInfo,
  findCourseRun,
  isProfileOfLoggedinUser,
  labelSort,
  classify,
} from '../util/util';
import {
  EDUCATION_LEVELS,
  USER_PROFILE_RESPONSE,
  HIGH_SCHOOL,
  ASSOCIATE,
  BACHELORS,
  DOCTORATE,
  MASTERS,
  PROFILE_STEP_LABELS,
  CYBERSOURCE_CHECKOUT_RESPONSE,
  DASHBOARD_RESPONSE,
} from '../constants';
import { assertMaybeEquality, assertIsNothing } from '../lib/sanctuary_test';
import { program } from '../components/ProgressWidget_test';

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

  describe('generateNewWorkHistory', () => {
    it('generates a new work history object', () => {
      assert.deepEqual(generateNewWorkHistory(), {
        position: "",
        industry: "",
        company_name: "",
        start_date: "",
        end_date: null,
        city: "",
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
        'graduation_date': "",
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
    it('uses the profile image if available', () => {
      let url = "/url";
      assert.equal(url, makeProfileImageUrl({ image: url }));
    });

    it('uses a default profile image if not available, removing duplicate slashes', () => {
      assert.equal(
        '/static/images/avatar_default.png',
        makeProfileImageUrl({})
      );
    });
  });

  describe('getPreferredName', () => {
    let profile;
    beforeEach(() => {
      profile = {
        username: 'jane_username',
        preferred_name: 'jane preferred',
        first_name: 'jane',
        last_name: 'doe',
      };
    });

    it('prefers to show the preferred name', () => {
      assert.equal('jane preferred', getPreferredName(profile));
    });

    it('uses first_name if preferred_name is not available', () => {
      profile.preferred_name = undefined;
      assert.equal('jane doe', getPreferredName(profile));
    });

    it('uses the username if first_name and preferred_name are not available', () => {
      profile.preferred_name = undefined;
      profile.first_name = undefined;
      assert.equal('jane_username doe', getPreferredName(profile));
    });

    it('shows the last name by default', () => {
      assert.equal('First Last', getPreferredName({
        first_name: 'First',
        last_name: 'Last'
      }));
    });

    it('does not show the last name if `last === false`', () => {
      assert.equal('First', getPreferredName({
        preferred_name: 'First',
        last_name: 'Last',
      }, false));
    });

    [true, false].forEach(bool => {
      it(`shows just the first name if 'last === ${bool}' and 'profile.last_name === undefined'`, () => {
        assert.equal('First', getPreferredName({preferred_name: 'First'}, bool));
      });
    });
  });

  describe('getLocation', () => {
    it('should return `${city}, ${country}` for a non-us location', () => {
      let nonUS = {
        country: 'AF',
        state_or_territory: 'AF-KAB',
        city: 'Kabul'
      };
      assert.equal(getLocation(nonUS), 'Kabul, Afghanistan');
    });

    it('should return `${city}, ${state}, US` for a US location', () => {
      let us = {
        country: 'US',
        state_or_territory: 'US-ME',
        city: 'Portland'
      };
      assert.equal(getLocation(us), 'Portland, ME, US');
      // assert hide state
      assert.equal(getLocation(us, false), 'Portland, US');
    });
  });

  describe('getEmployer', () => {
    it('should return Nothing if the user has no job history', () => {
      let clone = R.clone(USER_PROFILE_RESPONSE);
      clone.work_history = [];
      assertIsNothing(getEmployer(clone));
    });

    it('should return the current employer if the user is currently employed', () => {
      let clone = R.clone(USER_PROFILE_RESPONSE);
      clone.work_history.push({
        company_name: "Foobarcorp",
        end_date: null
      });
      assertMaybeEquality(Just("Foobarcorp"), getEmployer(clone));
    });

    it('should return the most recent job if the user is not currently employed', () => {
      assertMaybeEquality(Just("Planet Express"), getEmployer(USER_PROFILE_RESPONSE));
    });
  });

  describe('makeProfileProgressDisplay', () => {
    it('renders the right active display', () => {
      let keys = [...PROFILE_STEP_LABELS.keys()];
      PROFILE_STEP_LABELS.forEach((label, step) => {
        let i = keys.findIndex(k => k === step);

        let svg = makeProfileProgressDisplay(step);
        let desc = svg.props.children[0];
        assert.equal(desc.props.children.join(""), `Profile progress: ${label}`);

        let foundCircle = false, foundCircleText = false, foundText = false;
        for (let child of svg.props.children[1]) {
          if (child.key === `circle_${i}`) {
            // the green circle should be the currently selected one
            assert.equal(child.props.fill, "#a31f34");
            foundCircle = true;
          }
          if (child.key === `circletext_${i}`) {
            assert.equal(child.props.children, `${i + 1}`);
            foundCircleText = true;
          }
          if (child.key === `text_${i}`) {
            assert.equal(child.props.children, label);
            foundText = true;
          }
        }
        if (!foundCircle || !foundCircleText || !foundText) {
          assert(false,
            `Unable to find one of circle: ${foundCircle} circleText: ${foundCircleText} text: ${foundText}`
          );
        }
      });
    });
  });

  describe('Profile of logged in user check', () => {
    let settingsBackup;

    beforeEach(() => {
      settingsBackup = SETTINGS;
    });

    afterEach(() => {
      SETTINGS = settingsBackup;
    });

    it('when user is not logged in', () => {
      SETTINGS = Object.assign({}, SETTINGS, {user: null});
      let profile = { username: "another_user" };
      assert.isNotTrue(isProfileOfLoggedinUser(profile));
    });

    it("when other user's profile", () => {
      let profile = { username: "another_user" };
      assert.isNotTrue(isProfileOfLoggedinUser(profile));
    });

    it("when loggedin user's profile", () => {
      let profile = { username: SETTINGS.user.username };
      assert.isTrue(isProfileOfLoggedinUser(profile));
    });
  });

  describe('User privilege check', () => {
    let settingsBackup;

    beforeEach(() => {
      settingsBackup = SETTINGS;
    });

    afterEach(() => {
      SETTINGS = settingsBackup;
    });

    it('should return the value of the first function if the profile username matches', () => {
      let profile = { username: SETTINGS.user.username };
      let privilegedCallback = () => "hi";
      assert.equal(userPrivilegeCheck(profile, privilegedCallback), "hi");
    });

    it('should return the second argument if the profile username matches', () => {
      let profile = { username: SETTINGS.user.username };
      let privilegedString = "hi";
      assert.equal(userPrivilegeCheck(profile, privilegedString), "hi");
    });

    it('should return the value of the second function if the profile username does not match', () => {
      let profile = { username: "another_user" };
      let privilegedCallback = () => "vim";
      let unprivilegedCallback = () => "emacs";
      assert.equal(userPrivilegeCheck(profile, privilegedCallback, unprivilegedCallback), "emacs");
    });

    it('should return the value of the second argument if the profile username does not match', () => {
      let profile = { username: "another_user" };
      let privilegedCallback = () => "vim";
      let unprivilegedString = "emacs";
      assert.equal(userPrivilegeCheck(profile, privilegedCallback, unprivilegedString), "emacs");
    });

    it('should return the value of the second function if user is not logged in', () => {
      SETTINGS = Object.assign({}, SETTINGS, {user: null});
      let profile = { username: "another_user" };
      let privilegedCallback = () => "vim";
      let unprivilegedCallback = () => "emacs";
      assert.equal(userPrivilegeCheck(profile, privilegedCallback, unprivilegedCallback), "emacs");
    });
  });

  describe('calculateDegreeInclusions', () => {
    for (const { value: outerValue, label } of EDUCATION_LEVELS) {
      it(`turns on all switches before and including ${label}`, () => {
        let copy = {};
        let found = false;
        for (const { value: innerValue } of EDUCATION_LEVELS) {
          copy[innerValue] = !found;
          if (innerValue === outerValue) {
            found = true;
          }
        }

        let clone = Object.assign({}, USER_PROFILE_RESPONSE, {
          edx_level_of_education: outerValue,
          education: []
        });
        assert.deepEqual(copy, calculateDegreeInclusions(clone));
      });
    }

    it('turns on all switches if there is no edx_level_of_education', () => {
      let defaults = {};
      for (const { value } of EDUCATION_LEVELS) {
        defaults[value] = true;
      }

      let clone = Object.assign({}, USER_PROFILE_RESPONSE, {
        edx_level_of_education: null,
        education: []
      });
      assert.deepEqual(defaults, calculateDegreeInclusions(clone));
    });

    it('turns on the switch if there is at least one education of that level', () => {
      let clone = Object.assign({}, USER_PROFILE_RESPONSE, {
        edx_level_of_education: HIGH_SCHOOL,
        education: [{
          degree_name: HIGH_SCHOOL
        }, {
          degree_name: DOCTORATE
        }]
      });
      assert.deepEqual(calculateDegreeInclusions(clone), {
        [HIGH_SCHOOL]: true,
        [DOCTORATE]: true,
        [BACHELORS]: false,
        [MASTERS]: false,
        [ASSOCIATE]: false
      });
    });
  });

  describe('callFunctionArray', () => {
    it('should take an array of functions, call them in series with given args, and return list of results', () => {
      let testFunctionA = (arg) => (`testFunctionA ${arg}`),
        testFunctionB = (arg) => (`testFunctionB ${arg}`),
        arg = 'arg';
      let testFunctionArray = [
        testFunctionA,
        testFunctionA,
        testFunctionB
      ];
      let results = callFunctionArray(testFunctionArray, arg);
      assert.deepEqual(results, [
        'testFunctionA arg',
        'testFunctionA arg',
        'testFunctionB arg'
      ]);
    });
  });

  describe('validationErrorSelector', () => {
    const invalid = "invalid-input";

    it('should return invalid-input if keySet matches an error', () => {
      let errors = { foo: "WARNING" };
      let keySet = ['foo'];
      assert.equal(validationErrorSelector(errors, keySet), invalid);
    });

    it('should not return invalid-input if keySet does not match an error', () => {
      let errors = { foo: "WARNING" };
      let keySet = ['bar'];
      assert.equal(validationErrorSelector(errors, keySet), "");
    });

    it('should not return invalid-input if there are no errors', () => {
      let errors = {};
      let keySet = ['bar'];
      assert.equal(validationErrorSelector(errors, keySet), "");
    });
  });

  describe('asPercent', () => {
    it("returns an empty string for null or undefined", () => {
      assert.equal(asPercent(undefined), "");
      assert.equal(asPercent(null), "");
    });

    it("handles NaN, - and + inf", () => {
      assert.equal(asPercent(Infinity), "");
      assert.equal(asPercent(-Infinity), "");
      assert.equal(asPercent(NaN), "");
    });

    it("formats valid numbers", () => {
      assert.equal(asPercent(1234.567), "123457%");
      assert.equal(asPercent(-.34), "-34%");
      assert.equal(asPercent(.129), "13%");
    });
  });

  describe('createForm', () => {
    it('creates a form with hidden values corresponding to the payload', () => {
      const { url, payload } = CYBERSOURCE_CHECKOUT_RESPONSE;
      const form = createForm(url, payload);

      let clone = _.clone(payload);
      for (let hidden of form.querySelectorAll("input[type=hidden]")) {
        const key = hidden.getAttribute('name');
        const value = hidden.getAttribute('value');
        assert.equal(clone[key], value);
        delete clone[key];
      }
      // all keys exhausted
      assert.deepEqual(clone, {});
      assert.equal(form.getAttribute("action"), url);
      assert.equal(form.getAttribute("method"), "post");
    });
  });

  describe('formatPrice', () => {
    it('format price', () => {
      assert.equal(formatPrice(20), "$20");
    });
  });

  describe('programCourseInfo', () => {
    it('assert program info', () => {
      const programInfoActual = programCourseInfo(program);

      assert.deepEqual(programInfoActual, {
        totalPassedCourses: 1,
        totalCourses: 3
      });
    });
  });

  describe('findCourseRun', () => {
    it('iterates and finds the course run, course, and program', () => {
      let run = {
        id: 3,
        course_id: "xyz"
      };
      let course = {
        runs: [run],
        id: 2
      };
      let program = {
        courses: [course],
        id: 1,
      };

      assert.deepEqual(
        findCourseRun([program], _run => run.course_id === _run.course_id),
        [run, course, program],
      );
    });

    it('skips runs when there is an exception', () => {
      let run = {
        id: 3,
        course_id: "xyz"
      };
      let course = {
        runs: [run],
        id: 2
      };
      let program = {
        courses: [course],
        id: 1,
      };

      assert.deepEqual(
        findCourseRun([program], () => {
          throw new Error();
        }),
        [null, null, null],
      );
    });

    it('finds courses with no course runs', () => {
      let course = {
        runs: [],
        id: 2
      };
      let program = {
        courses: [course],
        id: 1,
      };

      assert.deepEqual(
        findCourseRun([program], (_run, _course) => _course.runs.length === 0),
        [null, course, program]
      );
    });

    it('finds a program with no courses', () => {
      let program = {
        courses: [],
        id: 1
      };

      assert.deepEqual(
        findCourseRun([program], (_run, _course, _program) => _program.courses.length === 0),
        [null, null, program]
      );
    });

    it('returns an empty object for each if selector never matches', () => {
      assert.deepEqual(
        findCourseRun(DASHBOARD_RESPONSE, () => false),
        [null, null, null],
      );
    });
  });

  describe('classify', () => {
    it('turns a string into something appropriate for a CSS class', () => {
      assert.equal(classify('Foo Bar'), 'foo-bar');
      assert.equal(classify('fooBar'), 'foo-bar');
      assert.equal(classify('Foobar'), 'foobar');
      assert.equal(classify('foo_barBaz'), 'foo-bar-baz');
      assert.equal(classify('foo_bar Baz'), 'foo-bar-baz');
    });

    it('returns an empty string when passed an empty string or undefined', () => {
      assert.equal(classify(''), '');
      assert.equal(classify(undefined), '');
    });
  });

  describe('labelSort', () => {
    it('sorts options by lowercase alphabetical order', () => {
      let input = [
        {
          value: '1',
          label: 'One',
        },
        {
          value: '2',
          label: 'two',
        },
        {
          value: '3',
          label: 'Three',
        }
      ];

      let expected = [
        input[0],
        input[2],
        input[1],
      ];
      assert.deepEqual(expected, labelSort(input));
    });
  });
});
