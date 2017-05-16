/* global SETTINGS: false */
import { assert } from 'chai';
import React from 'react';
import R from 'ramda';
import _ from 'lodash';
import { shallow } from 'enzyme';
import { S } from '../lib/sanctuary';
const { Just } = S;

import {
  makeStrippedHtml,
  makeProfileImageUrl,
  generateNewEducation,
  generateNewWorkHistory,
  getPreferredName,
  getRomanizedName,
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
  currentOrFirstIncompleteStep,
  getUserDisplayName,
  renderSeparatedComponents,
  isNilOrBlank,
  highlight,
  sortedCourseRuns,
  mapObj,
  wait,
} from '../util/util';
import {
  EDUCATION_LEVELS,
  HIGH_SCHOOL,
  ASSOCIATE,
  BACHELORS,
  DOCTORATE,
  MASTERS,
  PROFILE_STEP_LABELS,
  PERSONAL_STEP,
  EDUCATION_STEP,
} from '../constants';
import {
  USER_PROFILE_RESPONSE,
  DASHBOARD_RESPONSE,
  CYBERSOURCE_CHECKOUT_RESPONSE,
} from '../test_constants';
import { assertMaybeEquality, assertIsNothing } from '../lib/sanctuary_test';
import { program } from '../components/ProgressWidget_test';
import { makeRun, makeCourse, makeProgram } from '../factories/dashboard';

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
      assert.equal(url, makeProfileImageUrl({ image_medium: url }, false));
    });

    it('uses a default profile image if not available, removing duplicate slashes', () => {
      assert.equal(
        '/static/images/avatar_default.png',
        makeProfileImageUrl({}, false)
      );
    });

    it('uses the small profile image', () => {
      let url = '/url';
      let smallUrl = '/small';
      assert.equal(smallUrl, makeProfileImageUrl({
        image_medium: url,
        image_small: smallUrl,
      }, true));
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


  describe('getRomanizedName', () => {
    it('returns romanized First Last', () => {
      assert.equal('romanized_jane romanized_doe', getRomanizedName({
        romanized_first_name: 'romanized_jane',
        romanized_last_name: 'romanized_doe',
        first_name: 'jane',
        last_name: 'doe',
      }));
    });

    it('falls back to first / last if romanized is not there', () => {
      assert.equal('jane doe', getRomanizedName({
        first_name: 'jane',
        last_name: 'doe',
      }));
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

    it('should return `${city}, ` when no country code', () => {
      let us = {
        country: null,
        state_or_territory: 'US-ME',
        city: 'Portland'
      };
      assert.equal(getLocation(us, false), 'Portland, ');
    });

    it('should return `US` when no city', () => {
      let us = {
        country: 'US',
        state_or_territory: 'US-ME',
        city: null
      };
      assert.equal(getLocation(us, false), 'US');
    });

    it('should return `-` when no city and no country', () => {
      let us = {
        country: null,
        state_or_territory: 'US-ME',
        city: null
      };
      assert.equal(getLocation(us, false), '');
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

  describe('currentOrFirstIncompleteStep', () => {
    it('should return the validated step if current step is null', () => {
      let step = currentOrFirstIncompleteStep(null, PERSONAL_STEP);

      assert.equal(step, PERSONAL_STEP);
    });

    it('should return the current step if validated step is null', () => {
      let step = currentOrFirstIncompleteStep(PERSONAL_STEP, null);

      assert.equal(step, PERSONAL_STEP);
    });

    it('should return the current step if validated step is greater', () => {
      let step = currentOrFirstIncompleteStep(PERSONAL_STEP, EDUCATION_STEP);

      assert.equal(step, PERSONAL_STEP);
    });

    it('should return the validated step if current step is greater', () => {
      let step = currentOrFirstIncompleteStep(EDUCATION_STEP, PERSONAL_STEP);

      assert.equal(step, PERSONAL_STEP);
    });
  });

  describe('Profile of logged in user check', () => {
    it('when user is not logged in', () => {
      SETTINGS.user = null;
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
      SETTINGS.user = null;
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

        let clone = {
          ...USER_PROFILE_RESPONSE,
          edx_level_of_education: outerValue,
          education: [],
        };
        assert.deepEqual(copy, calculateDegreeInclusions(clone));
      });
    }

    it('turns on all switches if there is no edx_level_of_education', () => {
      let defaults = {};
      for (const { value } of EDUCATION_LEVELS) {
        defaults[value] = true;
      }

      let clone = {
        ...USER_PROFILE_RESPONSE,
        edx_level_of_education: null,
        education: [],
      };
      assert.deepEqual(defaults, calculateDegreeInclusions(clone));
    });

    it('turns on the switch if there is at least one education of that level', () => {
      let clone = {
        ...USER_PROFILE_RESPONSE,
        edx_level_of_education: HIGH_SCHOOL,
        education: [{
          degree_name: HIGH_SCHOOL
        }, {
          degree_name: DOCTORATE
        }],
      };
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
      assert.equal(formatPrice(20.005), "$20.01");
      assert.equal(formatPrice(20.10), "$20.10");
      assert.equal(formatPrice(20.6059), "$20.61");
      assert.equal(formatPrice(20.6959), "$20.70");
      assert.equal(formatPrice(20.1234567), "$20.12");
    });

    it('returns an empty string if null or undefined', () => {
      assert.equal(formatPrice(null), '');
      assert.equal(formatPrice(undefined), '');
    });
  });

  describe('programCourseInfo', () => {
    it('assert program info', () => {
      const programInfoActual = programCourseInfo(program);

      assert.deepEqual(programInfoActual, {
        totalPassedCourses: 3,
        totalCourses: 5
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
        findCourseRun(DASHBOARD_RESPONSE.programs, () => false),
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

  describe('getUserDisplayName', () => {
    let profile;
    beforeEach(() => {
      profile = {
        username: 'jane_username',
        first_name: 'jane',
        last_name: 'doe',
        preferred_name: 'test'
      };
    });

    it('shows first, last, and preferred names', () => {
      assert.equal('jane doe (test)', getUserDisplayName(profile));
    });

    it('shows username when first name is blank', () => {
      profile.first_name = null;
      assert.equal('jane_username doe (test)', getUserDisplayName(profile));
    });

    it('does not show preferred name when that value is blank', () => {
      profile.preferred_name = null;
      assert.equal('jane doe', getUserDisplayName(profile));
    });

    it('does not show preferred name when first name has same value', () => {
      profile.first_name = 'test';
      assert.equal('test doe', getUserDisplayName(profile));
    });
  });

  describe('highlight', () => {
    it("doesn't highlight if there's no highlight phrase", () => {
      assert.equal(highlight('abc', ''), 'abc');
    });

    it("doesn't highlight if there's no text", () => {
      assert.equal(highlight(null, 'xyz'), null);
    });

    it("filters out diacritics and makes text and phrase lowercase", () => {
      let name = 'Côté';
      let phrase = 'CÖ';
      let result = highlight(name, phrase);
      assert.equal(shallow(result).text(), name);
      assert.equal(shallow(result).find('.highlight').text(), "Cô");
    });

    it("doesn't highlight if phrase doesn't match", () => {
      let result = highlight('abc', 'xyz');
      let wrapper = shallow(result);
      assert.equal(wrapper.text(), 'abc');
      assert.equal(wrapper.find(".highlight").length, 0);
    });

    it("handles unicode properly", () => {
      let dog = "🐶";
      let catdogfish = "🐱🐶🐟";
      let result = highlight(catdogfish, dog);
      assert.equal(catdogfish, shallow(result).text());
      assert.equal(dog, shallow(result).find(".highlight").text());
    });

    it("handles multiple matches", () => {
      let phrase = "match";
      let text = "match1 match2";
      let result = highlight(text, phrase);
      assert.equal(
        shallow(result).html(),
        '<span><span class="highlight">match</span>1 <span class="highlight">match</span>2</span>',
      );
    });
  });

  describe('renderSeparatedComponents', () => {
    it('renders a list of components with a separator that has specified text content', () => {
      let components = [
        <div key={"1"}>div1</div>,
        <div key={"2"}>div2</div>,
        <div key={"3"}>div3</div>
      ];
      let separatedComponents = renderSeparatedComponents(components, ' | ');
      assert.equal(separatedComponents[0].props.children, 'div1');
      assert.equal(separatedComponents[1].type, 'span');
      assert.equal(separatedComponents[1].props.children, ' | ');
      assert.equal(separatedComponents[2].props.children, 'div2');
      assert.equal(separatedComponents[3].type, 'span');
      assert.equal(separatedComponents[3].props.children, ' | ');
      assert.equal(separatedComponents[4].props.children, 'div3');
    });

    it('renders a single component without a separator', () => {
      let components = [<div key={"1"}>div1</div>];
      let separatedComponents = renderSeparatedComponents(components, ' | ');
      assert.equal(separatedComponents[0].props.children, 'div1');
      assert.lengthOf(separatedComponents, 1);
    });
  });

  describe('isNilOrBlank', () => {
    it('returns true for undefined, null, and a blank string', () => {
      [undefined, null, ''].forEach(value => {
        assert.isTrue(isNilOrBlank(value));
      });
    });

    it('returns false for a non-blank string', () => {
      assert.isFalse(isNilOrBlank('not blank'));
    });
  });

  describe('sortedCourseRuns', () => {
    it('returns ordered course runs when already ordered', () => {
      const run1 = makeRun(1);
      const run2 = makeRun(2);
      const run3 = makeRun(3);
      const run4 = makeRun(4);
      const course1 = makeCourse(1);
      course1.runs = [run1, run2];
      const course2 = makeCourse(2);
      course2.runs = [run3, run4];
      const program = makeProgram();
      program.courses = [course1, course2];

      const expected = [run1, run2, run3, run4];
      const actual = sortedCourseRuns(program);
      assert.deepEqual(actual, expected);
    });

    it('returns ordered course runs when courses are unordered', () => {
      const run1 = makeRun(1);
      const run2 = makeRun(2);
      const run3 = makeRun(3);
      const run4 = makeRun(4);
      const course1 = makeCourse(1);
      course1.runs = [run1, run2];
      const course2 = makeCourse(2);
      course2.runs = [run3, run4];
      const program = makeProgram();
      program.courses = [course2, course1];  // courses are out of order

      const expected = [run1, run2, run3, run4];
      const actual = sortedCourseRuns(program);
      assert.deepEqual(actual, expected);
    });

    it('returns ordered course runs when runs are unordered', () => {
      const run1 = makeRun(1);
      const run2 = makeRun(2);
      const run3 = makeRun(3);
      const run4 = makeRun(4);
      const course1 = makeCourse(1);
      course1.runs = [run2, run1];  // course runs are out of order
      const course2 = makeCourse(2);
      course2.runs = [run3, run4];
      const program = makeProgram();
      program.courses = [course1, course2];

      const expected = [run1, run2, run3, run4];
      const actual = sortedCourseRuns(program);
      assert.deepEqual(actual, expected);
    });

    it('returns an empty array for no runs', () => {
      const course1 = makeCourse(1);
      course1.runs = [];
      const course2 = makeCourse(2);
      course2.runs = [];
      const program = makeProgram();
      program.courses = [course1, course2];

      const expected = [];
      const actual = sortedCourseRuns(program);
      assert.deepEqual(actual, expected);
    });

    it('returns an array with no gaps', () => {
      const run1 = makeRun(1);
      const run2 = makeRun(2);
      const run3 = makeRun(3);
      const run4 = makeRun(4);
      const course1 = makeCourse(1);
      course1.runs = [run1, run2];
      const course2 = makeCourse(2);
      course2.runs = [];  // no runs for this course
      const course3 = makeCourse(3);
      course3.runs = [run3, run4];
      const program = makeProgram();
      program.courses = [course1, course2, course3];

      const expected = [run1, run2, run3, run4];
      const actual = sortedCourseRuns(program);
      assert.deepEqual(actual, expected);
    });
  });

  describe('mapObj', () => {
    it('it allows you to edit keys and values', () => {
      let obj = { foo: 'bar' };
      let edited = mapObj(
        ([k, v]) => [`baz_${k}`, `baz_${v}`], obj
      );
      assert.deepEqual(edited, { baz_foo: 'baz_bar' });
    });
  });

  it('waits some milliseconds', done => {
    let executed = false;
    wait(30).then(() => {
      executed = true;
    });

    setTimeout(() => {
      assert.isFalse(executed);

      setTimeout(() => {
        assert.isTrue(executed);

        done();
      }, 20);
    }, 20);
  });
});
