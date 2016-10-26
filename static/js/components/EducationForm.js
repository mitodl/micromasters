// @flow
import React from 'react';
import IconButton from 'react-mdl/lib/IconButton';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card } from 'react-mdl/lib/Card';
import _ from 'lodash';
import moment from 'moment';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import ProfileFormFields from '../util/ProfileFormFields';
import ConfirmDeletion from './ConfirmDeletion';
import EducationDialog from './EducationDialog';
import {
  openEditEducationForm,
  openNewEducationForm,
  deleteEducationEntry,
} from '../util/profile_history_edit';
import { educationEntriesByDate } from '../util/sorting';
import type { Option } from '../flow/generalTypes';
import type {
  EducationEntry,
  Profile,
  ValidationErrors,
  SaveProfileFunc,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { Validator, UIValidator } from '../lib/validation/profile';

class EducationForm extends ProfileFormFields {
  props: {
    profile:                          Profile,
    ui:                               UIState;
    updateProfile:                    UpdateProfileFunc,
    saveProfile:                      SaveProfileFunc,
    clearProfileEdit:                 () => void,
    errors:                           ValidationErrors,
    setEducationDialogVisibility:     () => void,
    setEducationDialogIndex:          () => void,
    setEducationDegreeLevel:          () => void,
    setEducationLevelAnswers:         () => void,
    validator:                        Validator|UIValidator,
  };

  openEditEducationForm: Function = (index: number): void => {
    openEditEducationForm.call(this, index);
  };

  openNewEducationForm: Function = (level: string, index: number): void => {
    openNewEducationForm.call(this, level, index);
  };

  deleteEducationEntry: Function = (): void => {
    deleteEducationEntry.call(this);
  };

  educationLevelRadioSwitch: Function = (level: Object): React$Element<*> => {
    const {
      ui: { educationLevelAnswers }
    } = this.props;
    let radioIconStyle = {'marginRight': '8px'};
    let valueSelected = (level.value in educationLevelAnswers) ? "false" : null;
    return (
      <RadioButtonGroup
        className={`profile-radio-switch ${level.value}`}
        id={`profile-tab-education-switch-${level.value}`}
        name={`profile-tab-education-switch-${level.value}`}
        onChange={(event, value)=> this.handleRadioClick(value, level.value)}
        valueSelected={valueSelected}
      >
        <RadioButton value={"true"} label="Yes" iconStyle={radioIconStyle} style={{'marginRight': '30px'}} />
        <RadioButton value={"false"} label="No" iconStyle={radioIconStyle} style={{'marginRight': '15px'}} />
      </RadioButtonGroup>
    );
  };

  handleRadioClick(value: string, level: string): void {
    const {
      setEducationLevelAnswers,
      ui: { educationLevelAnswers }
    } = this.props;
    if (value === "true") {
      if (level in educationLevelAnswers) {
        setEducationLevelAnswers(_.omit(educationLevelAnswers, [level]));
      }
      this.openNewEducationForm(level, null);
    } else {
      setEducationLevelAnswers(Object.assign({}, educationLevelAnswers, {[level]: "No"}));
    }
  }

  renderEducationQuestionForm(level: Option): React$Element<*> {
    let label = level.label;
    let prefix = label.toLowerCase().startsWith("a") ? "an" : "a";
    let levelName = !label.endsWith("degree") ? `${label.toLowerCase()} degree` : label.toLowerCase();
    return <Cell col={12} className="profile-card-header profile-form-row">
      <span className="question">
        {`Do you have ${prefix} ${levelName}?`}
      </span>
      { this.educationLevelRadioSwitch(level) }
    </Cell>;
  }

  renderEducationLevelEntries(level: Option): Array<React$Element<*>|void>|void {
    const {
      profile: { education }
    } = this.props;
    let rows: Array<React$Element<*>|void> = [];
    if (education !== undefined) {
      let sorted = educationEntriesByDate(education);
      rows = sorted.filter(([,entry]) => (
        entry.degree_name === level.value
      )).map(([index, entry]) => this.educationRow(entry, index));
    }
    rows.unshift(
      <Cell col={12} className="profile-form-row" key={`header-row`}>
        <strong>{level.label}</strong>
      </Cell>
    );
    rows.push(
      <Cell col={12} className="profile-form-row" key={`add-row`}>
        <a
          className="mm-minor-action"
          onClick={() => this.openNewEducationForm(level.value, null)}
        >
          Add degree
        </a>
      </Cell>
    );
    return rows;
  }

  renderEducationLevel(level: Option): Array<React$Element<*>|void>|React$Element<*>|void {
    if (this.hasEducationAtLevel(level.value)) {
      return this.renderEducationLevelEntries(level);
    } else {
      return this.renderEducationQuestionForm(level);
    }
  }

  educationRow: Function = (education: EducationEntry, index: number) => {
    const { errors } = this.props;
    if (!('id' in education)) {
      // don't show new educations, wait until we saved on the server before showing them
      return;
    }
    let deleteEntry = () => this.openEducationDeleteDialog(index);
    let editEntry = () => this.openEditEducationForm(index);
    let validationAlert = () => {
      if (_.get(errors, ['education', String(index)])) {
        return <IconButton name="error" onClick={editEntry} />;
      }
    };
    let dateFormat = date => moment(date).format("MM[/]YYYY");
    return (
      <Cell col={12} className="profile-form-row" key={index}>
        <div className="basic-info">
          <div className="profile-row-name">
            {education.school_name}
          </div>
          <div className="profile-row-date-range">
            {`${dateFormat(education.graduation_date)}`}
          </div>
        </div>
        <div className="profile-row-icons row-width">
          {validationAlert()}
          <IconButton className="edit-button" name="edit" onClick={editEntry} />
          <IconButton className="delete-button" name="delete" onClick={deleteEntry} />
        </div>
      </Cell>
    );
  };

  hasEducationAtLevel(levelValue: string): boolean {
    const {
      profile: { education }
    } = this.props;
    return !_.isUndefined(
      education.find(entry => entry.degree_name === levelValue)
    );
  }

  render() {
    let {
      profile,
      ui: { showEducationDeleteDialog }
    } = this.props;

    if (profile['education'] === undefined) {
      return null;
    }

    let cardClass = levelValue => (
      this.hasEducationAtLevel(levelValue) ? '' : 'collapsed'
    );

    let levelsGrid = this.educationLevelOptions.map(level => (
      <Card shadow={1} className={`profile-form ${cardClass(level.value)}`} key={level.label}>
        <Grid className="profile-form-grid">
          {this.renderEducationLevel(level)}
        </Grid>
      </Card>
    ));

    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteEducationEntry}
          open={showEducationDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          itemText="degree"
        />
        <EducationDialog {...this.props} showLevelForm={false} />
        {levelsGrid}
      </div>
    );
  }
}

export default EducationForm;
