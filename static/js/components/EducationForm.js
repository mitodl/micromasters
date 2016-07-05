// @flow
import React from 'react';
import IconButton from 'react-mdl/lib/IconButton';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Switch from 'react-mdl/lib/Switch';
import FABButton from 'react-mdl/lib/FABButton';
import Icon from 'react-mdl/lib/Icon';
import { Card } from 'react-mdl/lib/Card';
import _ from 'lodash';
import moment from 'moment';

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
  BoundSaveProfile,
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class EducationForm extends ProfileFormFields {
  props: {
    profile:                          Profile,
    ui:                               UIState;
    updateProfile:                    () => void,
    saveProfile:                      BoundSaveProfile,
    clearProfileEdit:                 () => void,
    errors:                           ValidationErrors,
    setEducationDialogVisibility:     () => void,
    setEducationDialogIndex:          () => void,
    setEducationDegreeLevel:          () => void,
    setEducationDegreeInclusions:     () => void,
    setShowEducationDeleteAllDialog:  (bool: boolean) => void,
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

  renderEducationLevel(level: Option): Array<React$Element|void>|void {
    const {
      ui: { educationDegreeInclusions },
      profile: { education },
    } = this.props;
    if (educationDegreeInclusions[level.value]) {
      let rows: Array<React$Element|void> = [];
      if (education !== undefined) {
        let sorted = educationEntriesByDate(education);
        rows = sorted.filter(([,entry]) => (
          entry.degree_name === level.value
        )).map(([index, entry]) => this.educationRow(entry, index));
      }
      rows.push(
        <FABButton
          colored
          onClick={() => this.openNewEducationForm(level.value, null)}
          className="profile-add-button"
          key="I'm unique!"
        >
          <Icon name="add" />
        </FABButton>
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
    return <Grid className="profile-tab-card-grid" key={index}>
      <Cell col={4} className="profile-row-name">
        {education.school_name}
      </Cell>
      <Cell col={6} className="profile-row-date-range">
        {`${dateFormat(education.graduation_date)}`}
      </Cell>
      <Cell col={2} className="profile-row-icons">
        {validationAlert()}
        <IconButton className="edit-button" name="edit" onClick={editEntry} />
        <IconButton className="delete-button" name="delete" onClick={deleteEntry} />
      </Cell>
    </Grid>;
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

  handleSwitchClick(level: string): void {
    const {
      ui: { educationDegreeInclusions },
      setEducationDegreeInclusions,
      setEducationDegreeLevel,
      setShowEducationDeleteAllDialog,
      profile: { education },
    } = this.props;
    if ( !education.find(entry => entry.degree_name === level) ) {
      let newState = Object.assign({}, educationDegreeInclusions, {
        [level]: !educationDegreeInclusions[level]
      });
      setEducationDegreeInclusions(newState);
    } else {
      setEducationDegreeLevel(level);
      setShowEducationDeleteAllDialog(true);
    }
  }

  render() {
    let {
      profile,
      errors,
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
        return 'profile-tab-card-greyed';
      }
      return "";
    };

    let levelsGrid = this.educationLevelOptions.map(level => (
      <Card shadow={1} className={`profile-tab-card ${cardClass(level)}`} key={level.label}>
        <Grid className="profile-tab-card-grid">
          <Cell col={4} className="profile-card-title">
            {level.label}
          </Cell>
          <Cell col={7} />
          <Cell col={1}>
            <Switch
              id={`profile-tab-education-switch-${level.value}`}
              onChange={()=>{this.handleSwitchClick(level.value);}}
              checked={educationDegreeInclusions[level.value]}
            />
          </Cell>
        </Grid>
        {this.renderEducationLevel(level)}
        <Grid className="profile-tab-card-grid">
          <Cell col={12}>
            <span className="validation-error-text-large">
              {errors[`education_${level.value}_required`]}
            </span>
          </Cell>
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
