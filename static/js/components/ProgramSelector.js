// @flow
import React from 'react';
import _ from 'lodash';
import Select from 'react-select';

import NewEnrollmentDialog from './NewEnrollmentDialog';
import type {
  AvailableProgram,
  AvailablePrograms,
} from '../flow/enrollmentTypes';
import type { Option } from '../flow/generalTypes';

const ENROLL_SENTINEL = 'enroll';

export default class ProgramSelector extends React.Component {
  props: {
    addProgramEnrollment:        (programId: number) => void,
    currentProgramEnrollment:    AvailableProgram,
    programs:                    AvailablePrograms,
    enrollDialogError:           ?string,
    enrollDialogVisibility:      boolean,
    enrollSelectedProgram:       ?number,
    setCurrentProgramEnrollment: (enrollment: AvailableProgram) => void,
    setEnrollDialogError:        (error: ?string) => void,
    setEnrollDialogVisibility:   (open: boolean) => void,
    setEnrollSelectedProgram:    (programId: ?number) => void,
    selectorVisibility:          boolean,
  };

  selectEnrollment = (option: Option): void => {
    const {
      programs,
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
      let selected = programs.find(program => program.id === option.value);
      setCurrentProgramEnrollment(selected);
    }
  };

  makeOptions = (): Array<Option> => {
    const {
      currentProgramEnrollment,
      programs,
    } = this.props;

    let currentId;
    if (!_.isNil(currentProgramEnrollment)) {
      currentId = currentProgramEnrollment.id;
    }

    const sortedPrograms = _.sortBy(programs, 'title');
    let enrolledPrograms = sortedPrograms.filter(program => program.enrolled);
    let unenrolledPrograms = sortedPrograms.filter(program => !program.enrolled);
    let unselected = enrolledPrograms.filter(enrollment => enrollment.id !== currentId);

    let options = unselected.map(enrollment => ({
      value: enrollment.id,
      label: enrollment.title,
    }));
    if (unenrolledPrograms.length > 0) {
      options.push({label: "Enroll in a new program", value: ENROLL_SENTINEL});
    }
    return options;
  };

  render() {
    let {
      addProgramEnrollment,
      programs,
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

    let selected = programs.find(enrollment => enrollment.id === currentId);
    let options = this.makeOptions();

    if (programs.length === 0 || selectorVisibility === false) {
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
