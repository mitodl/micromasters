/* global SETTINGS: false */
import assert from 'assert';
import React from 'react';

import {
  makeStrippedHtml,
  makeProfileImageUrl,
  generateNewEducation,
  generateNewWorkHistory,
  getPreferredName,
  makeProfileProgressDisplay,
} from '../util/util';

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
      let expected = ["Personal", "Education", "Professional", "Profile Privacy"];

      for (let i = 0; i < expected.length; ++i) {
        let svg = makeProfileProgressDisplay(i);
        let desc = svg.props.children[0];
        assert.equal(desc.props.children.join(""), `Profile progress: ${expected[i]}`);

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
            assert.equal(child.props.children, expected[i]);
            foundText = true;
          }
        }
        if (!foundCircle || !foundCircleText || !foundText) {
          assert(false,
            `Unable to find one of circle: ${foundCircle} circleText: ${foundCircleText} text: ${foundText}`
          );
        }
      }
    });
  });
});
