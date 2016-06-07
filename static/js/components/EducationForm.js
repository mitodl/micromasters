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

class EducationForm extends ProfileFormFields {
  static propTypes = {
    profile:                        React.PropTypes.object,
    ui:                             React.PropTypes.object,
    updateProfile:                  React.PropTypes.func,
    clearProfileEdit:               React.PropTypes.func,
    errors:                         React.PropTypes.object,
    setEducationDialogVisibility:   React.PropTypes.func,
    setEducationDialogIndex:        React.PropTypes.func,
    setEducationDegreeLevel:        React.PropTypes.func,
    setEducationDegreeInclusions:   React.PropTypes.func,
  };

  openEditEducationForm = index => {
    openEditEducationForm.call(this, index);
  }

  openNewEducationForm = (level, index) => {
    openNewEducationForm.call(this, level, index);
  };

  deleteEducationEntry = () => {
    deleteEducationEntry.call(this);
  };

  renderEducationLevel(level){
    const {
      ui: { educationDegreeInclusions },
      profile: { education },
    } = this.props;
    if (educationDegreeInclusions[level.value]) {
      let rows = [];
      if (education !== undefined) {
        rows = Object.entries(education).
          filter(([, education]) => education.degree_name === level.value).
          map(([index, education]) => this.educationRow(education, index));
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

  educationRow = (education, index) => {
    const { errors } = this.props;
    if (!('id' in education)) {
      // don't show new educations, wait until we saved on the server before showing them
      return;
    }

    let deleteEntry = () => this.openEducationDeleteDialog(index);
    let editEntry = () => this.openEditEducationForm(index);
    let validationAlert = () => {
      if (_.get(errors, ['education', index])) {
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

  handleSwitchClick(level){
    const {
      ui: { educationDegreeInclusions },
      setEducationDegreeInclusions,
    } = this.props;
    let newState = Object.assign({}, educationDegreeInclusions);
    newState[level] = !educationDegreeInclusions[level];
    setEducationDegreeInclusions(newState);
  }

  render() {
    let {
      profile,
      errors,
      ui: {
        educationDegreeInclusions,
        showEducationDeleteDialog,
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
              onChange={()=>{this.handleSwitchClick(level.value);}}
              checked={educationDegreeInclusions[level.value]}
            />
          </Cell>
        </Grid>
        {this.renderEducationLevel(level)}
        <Grid className="profile-tab-grid">
          <Cell col={12}>
            <span className="validation-error-text-large">
              {errors[`education_${level.value}_required`]}
            </span>
          </Cell>
        </Grid>
      </Card>
    ));
    return (
      <div>
        <ConfirmDeletion
          deleteEntry={this.deleteEducationEntry}
          open={showEducationDeleteDialog}
          close={this.closeConfirmDeleteDialog}
        />
        <EducationDialog {...this.props} />
        {levelsGrid}
      </div>
    );
  }
}

export default EducationForm;
