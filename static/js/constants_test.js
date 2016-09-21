import _ from 'lodash';
import { assert } from 'chai';

import { DASHBOARD_RESPONSE } from './constants';

describe('constants', () => {
  it("doesn't duplicate any id numbers within the same type of information", () => {
    let programIds : Set<number> = new Set();
    let courseIds : Set<number> = new Set();
    let runIds : Set<number> = new Set();
    let courseKeys : Set<string> = new Set();
    for (let program of DASHBOARD_RESPONSE) {
      assert(!_.isNil(program.id), 'Missing program id');
      assert(!programIds.has(program.id), `Duplicate program id ${program.id}`);
      programIds.add(program.id);

      let positionInProgram : Set<number> = new Set();

      for (let course of program.courses) {
        assert(!_.isNil(course.id), `Missing course id for program ${program.id}`);
        assert(!courseIds.has(course.id), `Duplicate course id ${course.id}`);
        courseIds.add(course.id);

        assert(!_.isNil(course.position_in_program), `Missing position_in_program for course ${course.id}`);
        assert(!positionInProgram.has(course.position_in_program), `Duplicate position for course ${course.id}`);
        positionInProgram.add(course.position_in_program);

        let positionInCourse : Set<number> = new Set();
        for (let run of course.runs) {
          assert(!_.isNil(run.id), `Missing run id for course ${course.id}`);
          assert(!runIds.has(run.id), `Duplicate run id ${run.id}`);
          runIds.add(run.id);

          assert(!_.isNil(run.position), `Missing position for run ${run.id}`);
          assert(!positionInCourse.has(run.position), `Duplicate position for run ${run.id}`);
          positionInCourse.add(run.position);
          assert(run.course_id, `Missing course_id for run ${run.id}`);
          assert(!courseKeys.has(run.course_id), `Duplicate course key ${run.course_id}`);
          courseKeys.add(run.course_id);
        }
      }
    }
  });
});