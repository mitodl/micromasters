// @flow
import { assert } from 'chai';
import { shallow } from 'enzyme';
import React from 'react';
import { ReactPageClick } from 'react-page-click';

import ProgramSelector from './ProgramSelector';
import {
  PROGRAM_ENROLLMENTS,
  DASHBOARD_RESPONSE,
} from '../constants';

describe('ProgramSelector', () => {
  let renderProgramSelector = (
    enrollments = PROGRAM_ENROLLMENTS,
    currentProgramEnrollment = PROGRAM_ENROLLMENTS[1],
    programs = DASHBOARD_RESPONSE,
  ) => {
    return shallow(
      <ProgramSelector
        enrollments={{programEnrollments: enrollments}}
        dashboard={{programs: programs}}
        currentProgramEnrollment={currentProgramEnrollment}
      />
    );
  };

  it('renders an empty div if there are no program enrollments', () => {
    let wrapper = renderProgramSelector([], null);
    assert.equal(wrapper.find("div").text(), "");
  });

  it("renders within a ReactPageClick element if the program selector is open", () => {
  });

  it("renders the currently selected enrollment first, then all other enrollments", () => {

  });

  it("renders an 'Enroll in a new program' option if there is at least one available program", () => {

  });

  it("does not render the 'Enroll in a new program' option if there is not at least one available program", () => {

  });

  it('has a sorted list of program enrollments', () => {

  });

  it('opens the dropdown when clicked, and closes it when clicked again', () => {

  });

  it("shows the enrollment dialog when the 'Enroll in a new program' option is clicked", () => {

  });
});
