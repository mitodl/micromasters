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
import ValidationAlert  from './ValidationAlert';
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { DashboardState } from '../flow/dashboardTypes';
import type { Program } from '../flow/programTypes';
import type { Event } from '../flow/eventType';

class PersonalTab extends React.Component {
  props: {
    profile:        Profile,
    errors:         ValidationErrors,
    saveProfile:    SaveProfileFunc,
    updateProfile:  UpdateProfileFunc,
    ui:             UIState,
    nextStep:       () => void,
    prevStep:       () => void,
    dashboard:      DashboardState,
    setProgram:     Function,
    addProgramEnrollment: Function,
  };

  programListing = (programs: Array<Program>) => {
    const makeMenuItems = R.map(program => (
      <MenuItem value={program.id} key={program.id} primaryText={program.title} />
    ));
    const sortPrograms = R.sortBy(R.compose(R.toLower, R.prop('title')));
    const menuItems = R.compose(makeMenuItems, sortPrograms);
    return menuItems(programs) ;
  }

  setProgramHelper = (event: Event, key: string, value: string) => {
    const {
      dashboard: { programs },
      setProgram,
    } = this.props;
    let selected = programs.find(program => program.id === value);
    setProgram(selected);
  }

  selectProgram = () => {
    const {
      dashboard: { programs },
      ui: { selectedProgram },
      errors
    } = this.props;

    return (
      <SelectField
        value={selectedProgram ? selectedProgram.id : null}
        style={{width: "65%"}}
        hintText="Select Program"
        onChange={this.setProgramHelper}
        className="program-select"
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
          <ValidationAlert {...this.props} />
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

export default PersonalTab;
