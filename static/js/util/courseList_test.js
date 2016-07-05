// @flow
import { assert } from 'chai';
import moment from 'moment';
import React from 'react';

import {
  STATUS_NOT_OFFERED,
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_ENROLLED_NOT_VERIFIED,
  STATUS_OFFERED_NOT_ENROLLED,
  STATUS_VERIFIED_NOT_COMPLETED,
} from '../constants';
import {
  makeCourseStatusDisplay,
  makeRunStatusDisplay,
  makeCourseProgressDisplay,
} from './courseList';
import { makeStrippedHtml } from './util';

describe('courseList functions', () => {
  describe("makeCourseStatusDisplay", () => {
    let yesterday = '2016-03-30';
    let today = '2016-03-31';
    let tomorrow = '2016-04-01';
    let edxCourseKey = "edx course key";

    let renderCourseStatusDisplay = (course, ...args) => {
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
        status: STATUS_NOT_PASSED,
        runs: [],
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

    it("is an enrolled course but not verified", () => {
      assert.equal(
        renderCourseStatusDisplay({
          status: STATUS_ENROLLED_NOT_VERIFIED,
          runs: [{
            title: "Run title"
          }],
        }, moment(today)),
        "UPGRADE TO VERIFIED for Run title"
      );
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
            course_id: edxCourseKey,
            enrollment_start_date: today,
            title: "Run title"
          }]
        }, moment(today)),
        "ENROLL in Run title"
      );
    });

    it("is an offered course with an enrollment date of yesterday", () => {
      assert.equal(
        renderCourseStatusDisplay({
          status: STATUS_OFFERED_NOT_ENROLLED,
          runs: [{
            course_id: edxCourseKey,
            enrollment_start_date: yesterday,
            title: "Run title"
          }]
        }, moment(today)),
        "ENROLL in Run title"
      );
    });
    it("is an offered course with valid enrollment date and no edx_course_key", () => {
      assert.equal(
        renderCourseStatusDisplay({
          status: STATUS_OFFERED_NOT_ENROLLED,
          runs: [{
            enrollment_start_date: yesterday
          }]
        }, moment(today)),
        ""
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
        status: STATUS_NOT_OFFERED,
        runs: [],
      }), "");
    });

    it("has a status we don't know about", () => {
      assert.equal(renderCourseStatusDisplay({
        status: "missing",
        runs: [],
      }), "");
    });
  });

  describe("makeRunStatusDisplay", () => {
    it('shows Course passed when a course is passed', () => {
      assert.equal("Passed", makeRunStatusDisplay({
        status: STATUS_PASSED,
        runs: []
      }));
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

  describe("Course Progress Display", () => {
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
      status: STATUS_VERIFIED_NOT_COMPLETED,
      runs: [],
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
});
