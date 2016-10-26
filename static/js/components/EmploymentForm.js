// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Dialog from 'material-ui/Dialog';
import Card from 'react-mdl/lib/Card/Card';
import IconButton from 'react-mdl/lib/IconButton';
import _ from 'lodash';
import moment from 'moment';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import { userPrivilegeCheck } from '../util/util';
import { workEntriesByDate } from '../util/sorting';
import { employmentValidation } from '../lib/validation/profile';
import ProfileFormFields from '../util/ProfileFormFields';
import {
  openEditWorkHistoryForm,
  openNewWorkHistoryForm,
  deleteWorkHistoryEntry,
} from '../util/profile_history_edit';
import ConfirmDeletion from './ConfirmDeletion';
import SelectField from './inputs/SelectField';
import CountrySelectField from './inputs/CountrySelectField';
import StateSelectField from './inputs/StateSelectField';
import ValidationAlert from './ValidationAlert';

import type { WorkHistoryEntry } from '../flow/profileTypes';
import type { Validator, UIValidator } from '../lib/validation/profile';
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { AsyncActionHelper } from '../flow/reduxTypes';

class EmploymentForm extends ProfileFormFields {
  props: {
    profile:                          Profile,
    ui:                               UIState;
    updateProfile:                    UpdateProfileFunc,
    saveProfile:                      SaveProfileFunc,
    clearProfileEdit:                 () => void,
    errors:                           ValidationErrors,
    setWorkDialogVisibility:          () => void,
    setWorkDialogIndex:               () => void,
    setWorkHistoryAnswer:             () => void,
    setWorkHistoryEdit:               AsyncActionHelper,
    deletionIndex:                    number,
    showSwitch:                       boolean,
    validator:                        Validator|UIValidator,
  };

  openNewWorkHistoryForm: Function = (): void => {
    openNewWorkHistoryForm.call(this);
  };

  openEditWorkHistoryForm: Function = (index: number): void => {
    openEditWorkHistoryForm.call(this, index);
  };

  deleteWorkHistoryEntry: Function = (): void => {
    deleteWorkHistoryEntry.call(this);
  };

  saveWorkHistoryEntry: Function = (): void => {
    const { saveProfile, profile, ui } = this.props;
    saveProfile(employmentValidation, profile, ui).then(() => {
      this.closeWorkDialog();
    });
  };

  closeWorkDialog: Function = (): void => {
    const {
      setWorkDialogVisibility,
      clearProfileEdit,
      profile: { username }
    } = this.props;
    setWorkDialogVisibility(false);
    clearProfileEdit(username);
  };

  editWorkHistoryForm(): React$Element<*> {
    const { ui } = this.props;
    let keySet = (key) => ['work_history', ui.workDialogIndex, key];
    return (
      <Grid className="profile-tab-grid">
        <Cell col={12} className="profile-form-title">
          Add Employment
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('company_name'), 'Company Name')}
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            stateKeySet={keySet('state_or_territory')}
            countryKeySet={keySet('country')}
            label='Country'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          <StateSelectField
            stateKeySet={keySet('state_or_territory')}
            countryKeySet={keySet('country')}
            label='State or Territory'
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          {this.boundTextField(keySet('city'), 'City')}
        </Cell>
        <Cell col={12}>
          <SelectField
            keySet={keySet('industry')}
            label='Industry'
            options={this.industryOptions}
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('position'), 'Position')}
        </Cell>
        <Cell col={6}>
          {this.boundDateField(keySet('start_date'), 'Start Date', true)}
        </Cell>
        <Cell col={6}>
          {this.boundDateField(keySet('end_date'), 'End Date', true)}
          <span className="end-date-hint">
            Leave blank if this is a current position
          </span>
        </Cell>
      </Grid>
    );
  }

  renderWorkHistory(): Array<React$Element<*>|void>|void {
    const { ui, profile, profile: { work_history } } = this.props;
    if ( ui.workHistoryEdit === true ) {
      let workHistoryRows = [];
      if ( !_.isUndefined(work_history) ) {
        let sorted = workEntriesByDate(work_history);
        workHistoryRows = sorted.map(([index, entry]) => (
          entry.id === undefined ? undefined : this.jobRow(entry, index)
        ));
      }
      userPrivilegeCheck(profile, () => {
        workHistoryRows.push(
        <Cell col={12} className="profile-form-row add" key={"I'm unique!"}>
          <a
            className="mm-minor-action"
            onClick={this.openNewWorkHistoryForm}
          >
            Add employment
          </a>
        </Cell>
        );
      });
      workHistoryRows.unshift(
        <Cell col={12} className="profile-form-row profile-card-header" key="header-row">
          <span className="title">
            Employment
          </span>
        </Cell>
      );
      return workHistoryRows;
    }
  }

  jobRow (position: WorkHistoryEntry, index: number) {
    const {
      errors,
      profile,
    } = this.props;

    let dateFormat = date => moment(date).format("MM[/]YYYY");
    let endDateText = () => (
      _.isEmpty(position.end_date) ? "Current" : dateFormat(position.end_date)
    );
    let deleteEntry = () => this.openWorkDeleteDialog();
    let editEntry = () => this.openEditWorkHistoryForm(index);
    let validationAlert = () => {
      if (_.get(errors, ['work_history', String(index)])) {
        return <IconButton name="error" onClick={editEntry} />;
      }
    };
    let icons = () => {
      return userPrivilegeCheck(profile,
        () => (
          <div className="profile-row-icons">
            {validationAlert()}
            <IconButton className="edit-button" name="edit" onClick={editEntry} />
            <IconButton className="delete-button" name="delete" onClick={deleteEntry} />
          </div>
        ),
        () => <div />
      );
    };
    return (
      <Cell col={12} className="profile-form-row row-padding" key={index}>
        <div className="col user-credentials">
          <div className="profile-row-name">
            {`${position.company_name}, ${position.position}`}
          </div>
        </div>
        <div className="col user-credentials">
          <div className="profile-row-date-range">
            {`${dateFormat(position.start_date)} - ${endDateText()}`}
          </div>
          { icons() }
        </div>
      </Cell>
    );
  }

  renderWorkQuestionForm () {
    return <Cell col={12} className="profile-form-row profile-card-header">
      <span className="question">
        Do you want to add an employer?
      </span>
      { this.renderWorkRadioSwitch() }
    </Cell>;
  }

  renderWorkRadioSwitch () {
    const { ui: { workHistoryAnswer } } = this.props;
    let valueSelected = _.isNil(workHistoryAnswer) ? null : "false";
    let radioIconStyle = {'marginRight': '8px'};
    return (
      <RadioButtonGroup
        className="profile-radio-switch"
        name={"work-history-switch"}
        onChange={(event, value)=> this.handleRadioClick(value)}
        valueSelected={valueSelected}
      >
        <RadioButton value={"true"} label="Yes" iconStyle={radioIconStyle} style={{'marginRight': '30px'}} />
        <RadioButton value={"false"} label="No" iconStyle={radioIconStyle} style={{'marginRight': '15px'}} />
      </RadioButtonGroup>
    );
  }

  handleRadioClick: Function = (value: string): void => {
    const {
      setWorkHistoryAnswer,
      ui: { workHistoryAnswer }
    } = this.props;
    if (value === "true") {
      if (!_.isNil(workHistoryAnswer)) {
        setWorkHistoryAnswer();
      }
      this.openNewWorkHistoryForm();
    } else {
      setWorkHistoryAnswer(false);
    }
  };

  renderCardBody () {
    const {
      showSwitch,
      profile: { work_history }
    } = this.props;
    if (showSwitch && work_history.length === 0) {
      return this.renderWorkQuestionForm();
    } else {
      return this.renderWorkHistory();
    }
  }

  renderCard () {
    const {
      ui: { workHistoryEdit }
    } = this.props;
    let cardClass = workHistoryEdit ? '' : 'profile-tab-card-greyed';
    return <Card shadow={1} className={`profile-form ${cardClass}`} id={`work-history-card`}>
      <Grid className="profile-form-grid">
        { this.renderCardBody() }
      </Grid>
    </Card>;
  }

  render () {
    const {
      ui: {
        workDialogVisibility,
        showWorkDeleteDialog,
      },
    } = this.props;
    const actions = <ValidationAlert {...this.props}>
      <Button
        type='button'
        className="secondary-button cancel-button"
        onClick={this.closeWorkDialog}>
        Cancel
      </Button>
      <Button
        type='button'
        className="primary-button save-button"
        onClick={this.saveWorkHistoryEntry}>
        Save
      </Button>
    </ValidationAlert>;

    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteWorkHistoryEntry}
          open={showWorkDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          itemText="position"
        />
        <Dialog
          title="Employment"
          titleClassName="dialog-title"
          contentClassName="dialog employment-dialog"
          className="employment-dialog-wrapper"
          open={workDialogVisibility}
          onRequestClose={this.closeWorkDialog}
          actions={actions}
          autoScrollBodyContent={true}
        >
          {this.editWorkHistoryForm()}
        </Dialog>
        { this.renderCard() }
      </div>
    );
  }
}

export default EmploymentForm;
