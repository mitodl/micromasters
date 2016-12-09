// @flow
import TestUtils from 'react-addons-test-utils';
import { assert } from 'chai';
import sinon from 'sinon';
import _ from 'lodash';

import { findCourseRun } from '../util/util';
import { DASHBOARD_RESPONSE } from '../constants';
import type {
  Course,
  CourseRun,
  Program
} from '../flow/programTypes';
import type { Action } from '../flow/reduxTypes';
import type { Store } from 'redux';

export function findCourse(courseSelector: (course: Course, program: Program) => boolean): Course {
  let [, course, ] = findCourseRun(
    DASHBOARD_RESPONSE,
    (courseRun, _course, program) => courseSelector(_course, program)
  );
  if (course !== null) {
    return course;
  }
  throw "Unable to find course";
}

export const alterFirstRun = (course: Course, overrideObject: Object): CourseRun => {
  course.runs[0] = {
    ...course.runs[0],
    ...overrideObject
  };
  return course.runs[0];
};

export function findAndCloneCourse(courseSelector: (course: Course, program: Program) => boolean): Course {
  return _.cloneDeep(findCourse(courseSelector));
}

export function generateCourseFromExisting(courseToClone: Course, desiredRuns: number, runToCopy: ?CourseRun) {
  let course = _.cloneDeep(courseToClone);
  let currentRunCount = course.runs.length;
  if (currentRunCount < desiredRuns) {
    let courseRun = currentRunCount === 0 ? runToCopy : course.runs[0];
    if (!courseRun) {
      throw new Error('Need a course run to copy.');
    }
    let runsNeeded = desiredRuns - currentRunCount;
    let idMax = _.max(_.map(course.runs, run => run.id)) || 0;
    let positionMax = _.max(_.map(course.runs, run => run.position)) || 0;
    for (let i = 0; i < runsNeeded; i++) {
      let newCourseRun = _.cloneDeep(courseRun);
      positionMax++;
      idMax++;
      Object.assign(newCourseRun, {
        position: positionMax,
        id: idMax,
        course_id: `${newCourseRun.course_id}-new-${i}`
      });
      course.runs.push(newCourseRun);
    }
  } else if (currentRunCount > desiredRuns) {
    course.runs = _.take(course.runs, desiredRuns);
  }
  Object.assign(course, {
    id: 1,
    position_in_program: 0
  });
  return course;
}

export const modifyTextArea = (field: HTMLTextAreaElement, text: string): void => {
  field.value = text;
  TestUtils.Simulate.change(field);
  TestUtils.Simulate.keyDown(field, {key: "Enter", keyCode: 13, which: 13});
};

export const modifyTextField = (field: HTMLInputElement, text: string): void => {
  field.value = text;
  TestUtils.Simulate.change(field);
  TestUtils.Simulate.keyDown(field, {key: "Enter", keyCode: 13, which: 13});
};

export const modifySelectField = (field: HTMLElement, text: string): void => {
  let input = field.querySelector('.Select-input').querySelector('input');
  TestUtils.Simulate.focus(input);
  TestUtils.Simulate.change(input, { target: { value: text } });
  TestUtils.Simulate.keyDown(input, { keyCode: 9, key: 'Tab' });
};

export const modifyWrapperSelectField = (wrapper: Object, text: string): void => {
  let input = wrapper.find('input');
  input.simulate('focus');
  input.simulate('change', { target: { value: text }});
  input.simulate('keyDown', { keyCode: 9, key: 'Tab' });
};

export const clearSelectField = (field: HTMLElement): void => {
  let input = field.querySelector('.Select-input').querySelector('input');
  TestUtils.Simulate.focus(input);
  TestUtils.Simulate.keyDown(input, { keyCode: 8, key: 'Backspace' });
  TestUtils.Simulate.keyDown(input, { keyCode: 9, key: 'Tab' });
};


// dialog should be HTMLDivElement but flow complains incorrectly here
export const isActiveDialog = (dialog: any): boolean => (
  dialog.style["left"] === "0px"
);

let findActiveDialog = (dialogClassName: string): HTMLDivElement => {
  let elements: any = document.getElementsByClassName(dialogClassName);
  return [...elements].find(isActiveDialog);
};

export const noActiveDialogs = (dialogClassName: string): boolean => (
  findActiveDialog(dialogClassName) === undefined
);

export const activeDialog = (dialogClassName: string): HTMLDivElement => {
  let dialog = findActiveDialog(dialogClassName);
  assert.isDefined(dialog, `dialog element w/ className '${dialogClassName}' should be active`);
  return dialog;
};

export const activeDeleteDialog = () => (
  activeDialog('deletion-confirmation-dialog-wrapper')
);

export const noActiveDeleteDialogs = () => (
  noActiveDialogs('deletion-confirmation-dialog-wrapper')
);

export const localStorageMock = (init: any = {}) => {
  let storage = init;

  const sandbox = sinon.sandbox.create();

  const getItem = sandbox.spy(key => storage[key] || null);

  const setItem = sandbox.spy((key, value) => {
    storage[key] = value || "";
  });

  const removeItem = sandbox.spy(key => {
    delete storage[key];
  });

  const reset = () => {
    sandbox.reset();
    storage = {};
  };

  return {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    reset: reset,
  };
};

export function createAssertReducerResultState<State>(store: Store, getReducerState: (x: any) => State) {
  return (
    action: () => Action, stateLookup: (state: State) => any, defaultValue: any
  ): void => {
    const getState = () => stateLookup(getReducerState(store.getState()));

    assert.deepEqual(defaultValue, getState());
    for (let value of [true, null, false, 0, 3, 'x', {'a': 'b'}, {}, [3, 4, 5], [], '']) {
      let expected = value;
      if (value === null) {
        // redux-actions converts this to undefined
        expected = undefined;
      }
      store.dispatch(action(value));
      assert.deepEqual(expected, getState());
    }
  };
}
