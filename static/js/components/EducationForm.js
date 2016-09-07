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
} from '../util/editEducation';
import { educationValidation } from '../util/validation';
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
import type { Validator, UIValidator } from '../util/validation';
import type { AsyncActionHelper } from '../flow/reduxTypes';

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
    setEducationDegreeInclusions:     AsyncActionHelper,
    setShowEducationDeleteAllDialog:  (bool: boolean) => void,
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

  renderEducationLevel(level: Option): Array<React$Element<*>|void>|void {
    const {
      ui: { educationDegreeInclusions },
      profile: { education },
    } = this.props;
    if (educationDegreeInclusions[level.value]) {
      let rows: Array<React$Element<*>|void> = [];
      if (education !== undefined) {
        let sorted = educationEntriesByDate(education);
        rows = sorted.filter(([,entry]) => (
          entry.degree_name === level.value
        )).map(([index, entry]) => this.educationRow(entry, index));
      }
      rows.push(
        <Cell col={12} className="profile-form-row" key={"I'm unique!"}>
          <a
            className="mm-minor-action"
            onClick={() => this.openNewEducationForm(level.value, null)}
          >
            Add another
          </a>
        </Cell>
      );
      return rows;
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

  closeDeleteAllEducationDialog: Function = (): void => {
    const {
      setEducationDegreeLevel,
      setShowEducationDeleteAllDialog,
    } = this.props;
    setEducationDegreeLevel('');
    setShowEducationDeleteAllDialog(false);
  };

  deleteAllEducationEntriesForLevel: Function = (): void => {
    const {
      profile,
      saveProfile,
      ui,
      ui: { educationDegreeLevel, educationDegreeInclusions },
      setEducationDegreeInclusions,
    } = this.props;
    let clone = _.cloneDeep(profile);
    clone.education = clone.education.filter(entry => (
      entry.degree_name !== educationDegreeLevel
    ));
    let newState = Object.assign({}, educationDegreeInclusions, {
      [educationDegreeLevel]: false
    });
    setEducationDegreeInclusions(newState);
    saveProfile(educationValidation, clone, ui);
  };

  educationLevelRadioSwitch: Function = (inclusions: any[], level: Object): React$Element<*> => {
    return (
      <RadioButtonGroup 
        className={`profile-radio-switch ${level.value}`}
        id={`profile-tab-education-switch-${level.value}`}
        name={`profile-tab-education-switch-${level.value}`}
        onChange={(event, value)=> this.handleRadioClick(value, level.value)}
        valueSelected={String(inclusions[level.value])}
      >
        <RadioButton value={"true"} label="Yes" />
        <RadioButton value={"false"} label="No" />
      </RadioButtonGroup>
    );
  };

  handleRadioClick(value: string, level: string): void {
    const {
      ui: { educationDegreeInclusions },
      setEducationDegreeInclusions,
      setEducationDegreeLevel,
      setShowEducationDeleteAllDialog,
      profile: { education },
      profile,
      validator,
      updateProfile,
    } = this.props;

    const stringToBool = s => s === "true";
    if ( !education.find(entry => entry.degree_name === level) ) {
      let newState = Object.assign({}, educationDegreeInclusions, {
        [level]: stringToBool(value)
      });
      setEducationDegreeInclusions(newState).then(() => {
        let clone = _.cloneDeep(profile);
        updateProfile(clone, validator);
      });
    } else {
      setEducationDegreeLevel(level);
      setShowEducationDeleteAllDialog(true);
    }
  }

  render() {
    let {
      profile,
      ui: {
        educationDegreeInclusions,
        showEducationDeleteDialog,
        showEducationDeleteAllDialog,
        educationDegreeLevel,
      }
    } = this.props;

    if (profile['education'] === undefined){
      return null;
    }

    let cardClass = level => {
      if (!educationDegreeInclusions[level.value]) {
        return 'collapsed';
      }
      return "";
    };

    let prefix = label => label.toLowerCase().startsWith("a") ? "an" : "a";
    let levelName = (label) => (
      !label.endsWith("degree") ? `${label.toLowerCase()} degree` : label.toLowerCase()
    );

    let levelsGrid = this.educationLevelOptions.map(level => (
      <Card shadow={1} className={`profile-form ${cardClass(level)}`} key={level.label}>
        <Grid className="profile-form-grid">
          <Cell col={12} className="profile-card-header profile-form-row">
            <span>
              {`Do you have ${prefix(level.label)} ${levelName(level.label)}?`}
            </span>
            { this.educationLevelRadioSwitch(educationDegreeInclusions, level) }
          </Cell>
          {this.renderEducationLevel(level)}
        </Grid>
      </Card>
    ));
    let levelLabel;
    if ( educationDegreeLevel !== "" ) {
      levelLabel = this.educationLevelOptions.find(level => (
        level.value === educationDegreeLevel
      )).label;
    } else {
      levelLabel = "";
    }
    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteEducationEntry}
          open={showEducationDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          confirmText="Delete this entry?"
        />
        <ConfirmDeletion
          deleteFunc={this.deleteAllEducationEntriesForLevel}
          open={showEducationDeleteAllDialog}
          close={this.closeDeleteAllEducationDialog}
          confirmText={`Delete all ${levelLabel} entries?`}
        />
        <EducationDialog {...this.props} showLevelForm={false} />
        {levelsGrid}
      </div>
    );
  }
}

export default EducationForm;
