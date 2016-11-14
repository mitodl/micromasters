// @flow
/* global SETTINGS: false */
import React from 'react';
import _ from 'lodash';
import Card from 'react-mdl/lib/Card/Card';
import R from 'ramda';
import Select from 'react-select';

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
import type {
  AvailableProgram,
  AvailablePrograms,
} from '../flow/enrollmentTypes';
import {  validationErrorSelector } from '../util/util';
import type { Option } from '../flow/generalTypes';

export default class PersonalTab extends React.Component {
  props: {
    addProgramEnrollment:     Function,
    currentProgramEnrollment: AvailableProgram,
    errors:                   ValidationErrors,
    nextStep:                 () => void,
    prevStep:                 () => void,
    profile:                  Profile,
    programs:                 AvailablePrograms,
    saveProfile:              SaveProfileFunc,
    setProgram:               Function,
    ui:                       UIState,
    updateProfile:            UpdateProfileFunc,
  };

  sortPrograms = R.sortBy(R.compose(R.toLower, R.prop('title')));

  programOptions = R.compose(
    R.map(program => ({value: program.id, label: program.title})), this.sortPrograms
  );

  onChange = (selection: Option): void => {
    const {
      programs,
      setProgram,
    } = this.props;
    if ( selection && selection.value ) {
      let selected = programs.find(program => program.id === parseInt(selection.value));
      setProgram(selected);
    } else {
      setProgram(null);
    }
  };

  getSelectedProgramId = (): number|null => {
    const { ui: { selectedProgram }} = this.props;
    return selectedProgram ? selectedProgram.id : null;
  };

  selectProgram = (): React$Element<*> => {
    const { programs, errors } = this.props;
    return (
      <Select
        value={this.getSelectedProgramId()}
        onChange={this.onChange}
        className={`program-selectfield ${validationErrorSelector(errors, ['program'])}`}
        errorText={_.get(errors, "program")}
        options={this.programOptions(programs)}
      />
    );
  };

  render() {
    const { ui: { selectedProgram }, errors } = this.props;

    return (
      <div>
        <Card shadow={1} className="program-select">
          <h2>Program Selection</h2>
          <label>
            Which MicroMasters program are you signing up for?
            { this.selectProgram() }
          </label>
          <span className="validation-error-text">
            {_.get(errors, ['program'])}
          </span>
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
