// @flow
/* global SETTINGS: false */
import React from 'react';
import _ from 'lodash';
import Card from 'react-mdl/lib/Card/Card';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import R from 'ramda';

import PersonalForm from './PersonalForm';
import ProfileProgressControls from './ProfileProgressControls';
import {
  combineValidators,
  personalValidation,
  programValidation,
} from '../lib/validation/profile';
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { AvailablePrograms } from '../flow/enrollmentTypes';
import type { Event } from '../flow/eventType';
import {  validationErrorSelector } from '../util/util';
import type { ProgramEnrollment } from '../flow/enrollmentTypes';

export default class PersonalTab extends React.Component {
  props: {
    profile:        Profile,
    errors:         ValidationErrors,
    saveProfile:    SaveProfileFunc,
    updateProfile:  UpdateProfileFunc,
    ui:             UIState,
    nextStep:       () => void,
    prevStep:       () => void,
    programs:       AvailablePrograms,
    setProgram:     Function,
    addProgramEnrollment: Function,
    currentProgramEnrollment: ProgramEnrollment,
  };

  programListing = (programs: AvailablePrograms) => {
    const makeMenuItems = R.map(program => (
      <MenuItem value={program.id} key={program.id} primaryText={program.title} />
    ));
    const sortPrograms = R.sortBy(R.compose(R.toLower, R.prop('title')));
    const menuItems = R.compose(makeMenuItems, sortPrograms);
    return menuItems(programs);
  };

  setProgramHelper = (event: Event, key: string, value: string) => {
    const {
      programs,
      setProgram,
    } = this.props;
    let selected = programs.find(program => program.id === parseInt(value));
    setProgram(selected);
  };

  getSelectedProgramId = () : number|null => {
    let programId = null;
    const {
      ui: { selectedProgram },
      currentProgramEnrollment
    } = this.props;

    if (selectedProgram) {
      programId = selectedProgram.id;
    } else if(currentProgramEnrollment) {
      programId = currentProgramEnrollment.id;
    }

    return programId;
  }

  selectProgram = () => {
    const {
      programs,
      ui: { selectedProgram },
      errors
    } = this.props;

    return (
      <SelectField
        value={this.getSelectedProgramId()}
        style={{width: "65%"}}
        hintText="Select Program"
        onChange={this.setProgramHelper}
        className={`program-selectfield ${validationErrorSelector(errors, ['program'])}`}
        errorText={_.get(errors, "program")}
      >
        { this.programListing(programs) }
      </SelectField>
    );
  }

  render() {
    const { ui: { selectedProgram } } = this.props;

    return (
      <div>
        <Card shadow={1} className="program-select">
          <div className="section-header">Which MicroMasters program are you signing up for?</div>
          <br/>
          { this.selectProgram() }
        </Card>
        <Card shadow={1} className="profile-form">
          <PersonalForm {...this.props} validator={personalValidation} />
        </Card>
        <ProfileProgressControls
          {...this.props}
          nextBtnLabel="Next"
          programIdForEnrollment={selectedProgram ? selectedProgram.id : null}
          isLastTab={false}
          validator={
            combineValidators(
              personalValidation,
              programValidation
            )
          }
        />
      </div>
    );
  }
}
