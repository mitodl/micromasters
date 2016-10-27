// @flow
import React from 'react';
import _ from 'lodash';
import Select from 'react-select';

import NewEnrollmentDialog from './NewEnrollmentDialog';
import type { DashboardState } from '../flow/dashboardTypes';
import type {
  ProgramEnrollment,
  ProgramEnrollmentsState,
} from '../flow/enrollmentTypes';
import type { Option } from '../flow/generalTypes';

const ENROLL_SENTINEL = 'enroll';

export default class ProgramSelector extends React.Component {
  props: {
    addProgramEnrollment:        (programId: number) => void,
    currentProgramEnrollment:    ProgramEnrollment,
    programs:                    ProgramEnrollmentsState,
    enrollDialogError:           ?string,
    enrollDialogVisibility:      boolean,
    enrollSelectedProgram:       ?number,
    dashboard:                   DashboardState,
    setCurrentProgramEnrollment: (enrollment: ProgramEnrollment) => void,
    setEnrollDialogError:        (error: ?string) => void,
    setEnrollDialogVisibility:   (open: boolean) => void,
    setEnrollSelectedProgram:    (programId: ?number) => void,
    selectorVisibility:          boolean,
  };

  selectEnrollment = (option: Option): void => {
    const {
      programs: { programEnrollments },
      setCurrentProgramEnrollment,
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram,
    } = this.props;
    if (option.value === ENROLL_SENTINEL) {
      setEnrollDialogVisibility(true);
      setEnrollSelectedProgram(null);
      setEnrollDialogError(null);
    } else {
      let selected = programEnrollments.find(enrollment => enrollment.id === option.value);
      setCurrentProgramEnrollment(selected);
    }
  };

  makeOptions = (): Array<Option> => {
    const {
      currentProgramEnrollment,
      programs: { programEnrollments },
      dashboard: { programs },
    } = this.props;

    let currentId;
    if (!_.isNil(currentProgramEnrollment)) {
      currentId = currentProgramEnrollment.id;
    }

    const sortedProgramEnrollments = _.sortBy(programEnrollments, 'title');

    let unselected = sortedProgramEnrollments.filter(enrollment => enrollment.id !== currentId);
    let options = unselected.map(enrollment => ({
      value: enrollment.id,
      label: enrollment.title,
    }));

    let enrollmentLookup = new Map(sortedProgramEnrollments.map(enrollment => [enrollment.id, null]));
    let unenrolledPrograms = programs.filter(program => !enrollmentLookup.has(program.id));
    unenrolledPrograms = _.sortBy(unenrolledPrograms, 'title');

    if (unenrolledPrograms.length > 0) {
      options.push({label: "Enroll in a new program", value: ENROLL_SENTINEL});
    }
    return options;
  };

  render() {
    let {
      addProgramEnrollment,
      dashboard,
      programs,
      programs: {programEnrollments},
      enrollDialogError,
      enrollDialogVisibility,
      enrollSelectedProgram,
      currentProgramEnrollment,
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram,
      selectorVisibility,
    } = this.props;
    let currentId;
    if (!_.isNil(currentProgramEnrollment)) {
      currentId = currentProgramEnrollment.id;
    }

    let selected = programEnrollments.find(enrollment => enrollment.id === currentId);
    let options = this.makeOptions();

    if (programEnrollments.length === 0 || selectorVisibility === false) {
      return <div className="program-selector" />;
    } else {
      return <div className="program-selector">
        <Select
          options={options}
          onChange={this.selectEnrollment}
          searchable={false}
          placeholder={selected ? selected.title : ""}
          clearable={false}
          tabSelectsValue={false}
        />
        <NewEnrollmentDialog
          addProgramEnrollment={addProgramEnrollment}
          dashboard={dashboard}
          programs={programs}
          enrollDialogError={enrollDialogError}
          enrollDialogVisibility={enrollDialogVisibility}
          enrollSelectedProgram={enrollSelectedProgram}
          setEnrollDialogError={setEnrollDialogError}
          setEnrollDialogVisibility={setEnrollDialogVisibility}
          setEnrollSelectedProgram={setEnrollSelectedProgram}
        />
      </div>;
    }
  }
}
