// @flow
import React from 'react';
import _ from 'lodash';
import { ReactPageClick } from 'react-page-click';

import type { DashboardState } from '../flow/dashboardTypes';
import type {
  ProgramEnrollment,
  ProgramEnrollmentsState,
} from '../flow/enrollmentTypes';

export default class ProgramSelector extends React.Component {
  props: {
    currentProgramEnrollment:    ProgramEnrollment,
    enrollments:                 ProgramEnrollmentsState,
    enrollDialogVisibility:      boolean,
    enrollSelectedProgram:       ?number,
    dashboard:                   DashboardState,
    programSelectorOpen:         boolean,
    setCurrentProgramEnrollment: (enrollment: ProgramEnrollment) => void,
    setEnrollDialogVisibility:   (open: boolean) => void,
    setEnrollSelectedProgram:    (programId: number) => void,
    setProgramSelectorOpen:      (open: boolean) => void,
  };

  handleOpenSelect = () => {
    const { programSelectorOpen, setProgramSelectorOpen } = this.props;
    setProgramSelectorOpen(!programSelectorOpen);
  };

  selectEnrollment = (enrollment: ProgramEnrollment): void => {
    const { setCurrentProgramEnrollment, setProgramSelectorOpen } = this.props;
    setCurrentProgramEnrollment(enrollment);
    setProgramSelectorOpen(false);
  };

  showNewEnrollmentDialog = () => {
    let { setEnrollDialogVisibility } = this.props;
    setEnrollDialogVisibility(true);
  };

  render() {
    let {
      enrollments: { programEnrollments },
      programSelectorOpen,
      dashboard: { programs },
    } = this.props;
    let { currentProgramEnrollment } = this.props;
    let currentId;
    if (currentProgramEnrollment !== null) {
      currentId = currentProgramEnrollment.id;
    }

    programEnrollments = _.sortBy(programEnrollments, 'title');
    if (programEnrollments.length === 0) {
      return <div className="program-selector" />;
    }

    let selected = programEnrollments.find(enrollment => enrollment.id === currentId);
    let unselected = programEnrollments.filter(enrollment => enrollment.id !== currentId);
    let options = unselected.map(enrollment => (
      <div
        className="option"
        key={enrollment.id}
        onClick={() => this.selectEnrollment(enrollment)}
      >
        {enrollment.title}
      </div>
    ));

    let enrollmentLookup = new Map(programEnrollments.map(enrollment => [enrollment.id, null]));
    let unenrolledPrograms = programs.filter(program => !enrollmentLookup.has(program.id));
    unenrolledPrograms = _.sortBy(unenrolledPrograms, 'title');

    let enrollOption;
    if (unenrolledPrograms.length > 0) {
      enrollOption = <div
        className="option enroll-new-program"
        key="enroll-new-program"
        onClick={() => this.showNewEnrollmentDialog()}
      >
        Enroll in a new program
      </div>;
    }

    let select = <div className="select-container">
      <div className="select">
        <div className="selected-option" onClick={this.handleOpenSelect}>
          {selected.title} <i className="material-icons">arrow_drop_down</i>
        </div>
        <div className={`select-dropdown ${programSelectorOpen ? 'open' : ''}`}>
          {options}
          {enrollOption}
        </div>
      </div>
    </div>;

    let inner;
    if (programSelectorOpen) {
      inner = <ReactPageClick notify={this.handleOpenSelect}>
        {select}
      </ReactPageClick>;
    } else {
      inner = select;
    }

    return <div className="program-selector">
      {inner}
    </div>;
  }
}
