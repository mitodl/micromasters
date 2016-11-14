// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Dialog from 'material-ui/Dialog';
import Card from 'react-mdl/lib/Card/Card';
import IconButton from 'react-mdl/lib/IconButton';
import _ from 'lodash';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import {
  userPrivilegeCheck,
  isProfileOfLoggedinUser
} from '../util/util';
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
import INDUSTRIES from '../data/industries';
import { formatMonthDate } from '../util/date';
import type { Option } from '../flow/generalTypes';
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
  industryOptions: Array<Option> = INDUSTRIES.map(industry => ({
    value: industry,
    label: industry
  }));

  props: {
    profile:                          Profile,
    ui:                               UIState;
    updateProfile:                    UpdateProfileFunc,
    saveProfile:                      SaveProfileFunc,
    clearProfileEdit:                 () => void,
    errors:                           ValidationErrors,
    setDeletionIndex:                 (i: number) => void,
    setWorkDialogVisibility:          (b: boolean) => void,
    setWorkDialogIndex:               (i: number) => void,
    setWorkHistoryAnswer:             (b: ?boolean) => void,
    setWorkHistoryEdit:               AsyncActionHelper,
    setShowWorkDeleteDialog:          (b: boolean) => void,
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

  openWorkDeleteDialog: Function = (index: number): void => {
    const { setDeletionIndex, setShowWorkDeleteDialog } = this.props;
    setDeletionIndex(index);
    setShowWorkDeleteDialog(true);
  };

  addSpaceForError(keySet: string[]){
    const { errors } = this.props;
    let value = _.get(errors, keySet);
    return value === undefined ? "": "top-space";
  }

  editWorkHistoryForm(): React$Element<*> {
    const { ui, profile } = this.props;
    let keySet = (key): any => ['work_history', ui.workDialogIndex, key];
    let id = _.get(profile, keySet("id"));
    let title = id !== undefined ? 'Edit Employment' : 'Add Employment';

    return (
      <Grid className="profile-tab-grid">
        <Cell col={12} className="profile-form-title">
          {title}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('company_name'), 'Name of Employer')}
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
          <span className={`end-date-hint ${this.addSpaceForError(keySet('end_date'))}`}>
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
        <Cell col={12} className="profile-form-row add" key="I'm unique!">
          <button
            className="mm-minor-action"
            onClick={this.openNewWorkHistoryForm}
          >
            Add employment
          </button>
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

    let endDateText = () => (
      _.isEmpty(position.end_date) ? "Current" : formatMonthDate(position.end_date)
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
      <Cell col={12} className="profile-form-row row-padding row-with-border" key={index}>
        <div className="col user-credentials">
          <div className="profile-row-name">
            {`${position.company_name}, ${position.position}`}
          </div>
        </div>
        <div className="col user-credentials">
          <div className="profile-row-date-range">
            {`${formatMonthDate(position.start_date)} - ${endDateText()}`}
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
        name="work-history-switch"
        onChange={(event, value)=> this.handleRadioClick(value)}
        valueSelected={valueSelected}
      >
        <RadioButton value="true" label="Yes" iconStyle={radioIconStyle} style={{'marginRight': '30px'}} />
        <RadioButton value="false" label="No" iconStyle={radioIconStyle} style={{'marginRight': '15px'}} />
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
      ui: { workHistoryEdit },
      profile
    } = this.props;

    if (!isProfileOfLoggedinUser(profile) && (!profile.work_history || profile.work_history.length === 0)) {
      return null;
    }

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
    const actions = [
      <Button
        type='button'
        className="secondary-button cancel-button"
        key='cancel'
        onClick={this.closeWorkDialog}>
        Cancel
      </Button>,
      <Button
        type='button'
        className="primary-button save-button"
        key='save'
        onClick={this.saveWorkHistoryEntry}>
        Save
      </Button>
    ];

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
