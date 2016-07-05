/* global SETTINGS: false */
import { assert } from 'chai';
import React from 'react';

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
} from '../constants';

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
      let keys = [...PROFILE_STEP_LABELS.keys()];
      PROFILE_STEP_LABELS.forEach((label, step) => {
        let i = keys.findIndex(k => k === step);

        let svg = makeProfileProgressDisplay(step);
        let desc = svg.props.children[0];
        assert.equal(desc.props.children.join(""), `Profile progress: ${label}`);

        let foundCircle = false, foundCircleText = false, foundText = false;
        for (let child of svg.props.children[1]) {
          if (child.key === `circle_${i}`) {
            // the white circle should be the currently selected one
            assert.equal(child.props.fill, "white");
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

  describe('User privilege check', () => {
    it('should return the value of the first function if the profile username matches', () => {
      let profile = { username: SETTINGS.username };
      let privilegedCallback = () => "hi";
      assert.equal(userPrivilegeCheck(profile, privilegedCallback), "hi");
    });

    it('should return the second argument if the profile username matches', () => {
      let profile = { username: SETTINGS.username };
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
});
