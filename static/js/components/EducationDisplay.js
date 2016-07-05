// @flow
import React from 'react';
import IconButton from 'react-mdl/lib/IconButton';

import Grid, { Cell } from 'react-mdl/lib/Grid';
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
import { userPrivilegeCheck } from '../util/util';
import { HIGH_SCHOOL } from '../constants';
import { educationEntriesByDate } from '../util/sorting';
import type { EducationEntry } from '../flow/profileTypes';

export default class EducationDisplay extends ProfileFormFields {
  openEditEducationForm: Function = (index: number): void => {
    openEditEducationForm.call(this, index);
  };

  openNewEducationForm: Function = (level: string, index: number): void => {
    openNewEducationForm.call(this, level, index);
  };

  deleteEducationEntry: Function = (): void => {
    deleteEducationEntry.call(this);
  };

  educationRow: Function = (entry: EducationEntry, index: number): void => {
    const { profile, errors } = this.props;
    if (!('id' in entry)) {
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
    let degree = this.educationLevelOptions.find(level => (
      level.value === entry.degree_name
    )).label;
    let icons = () => (
      <Cell col={2} className="profile-row-icons">
        {validationAlert()}
        <IconButton className="edit-button" name="edit" onClick={editEntry} />
        <IconButton className="delete-button" name="delete" onClick={deleteEntry} />
      </Cell>
    );
    return (
      <Grid className="profile-tab-card-grid user-page" key={index}>
        <Cell col={4} className="profile-row-name">
          <span className="school-type">{ degree }</span><br/>
          { entry.school_name }
        </Cell>
        <Cell col={6} className="profile-row-date-range">
          {`${dateFormat(entry.graduation_date)}`}
        </Cell>
        { userPrivilegeCheck(profile, icons, () => <Cell col={2} />) }
      </Grid>
    );
  };

  renderEducationEntries: Function = (): React$Element[] => {
    const { profile, profile: { education }} = this.props;
    let rows = [];
    if (education !== undefined) {
      let sorted = educationEntriesByDate(education);
      rows = sorted.map( ([index, entry]) => this.educationRow(entry, index));
    }
    userPrivilegeCheck(profile, () => {
      rows.push(
        <FABButton
          colored
          id="add-education-button"
          className="profile-add-button"
          key="I'm unique!"
          onClick={() => this.openNewEducationForm(HIGH_SCHOOL, null)}
        >
          <Icon name="add" />
        </FABButton>
      );
    });
    return rows;
  };

  render() {
    const { ui: { showEducationDeleteDialog } } = this.props;
    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteEducationEntry}
          open={showEducationDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          confirmText="Delete this entry?"
        />
        <EducationDialog {...this.props} showLevelForm={true} />
        <Card shadow={1} className="profile-tab-card" id="education-card">
          <Grid className="profile-tab-card-grid">
            <Cell col={4} className="profile-card-title">
              Education
            </Cell>
            <Cell col={8} />
          </Grid>
          { this.renderEducationEntries() }
        </Card>
      </div>
    );
  }
}
