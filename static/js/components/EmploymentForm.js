// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Dialog from 'material-ui/Dialog';
import Card from 'react-mdl/lib/Card/Card';
import Switch from 'react-mdl/lib/Switch';
import FABButton from 'react-mdl/lib/FABButton';
import Icon from 'react-mdl/lib/Icon';
import IconButton from 'react-mdl/lib/IconButton';
import _ from 'lodash';
import moment from 'moment';

import { generateNewWorkHistory, userPrivilegeCheck } from '../util/util';
import { workEntriesByDate } from '../util/sorting';
import { employmentValidation } from '../util/validation';
import ProfileFormFields from '../util/ProfileFormFields';
import ConfirmDeletion from './ConfirmDeletion';
import SelectField from './inputs/SelectField';
import CountrySelectField from './inputs/CountrySelectField';
import StateSelectField from './inputs/StateSelectField';
import type { WorkHistoryEntry } from '../flow/profileTypes';

class EmploymentForm extends ProfileFormFields {
  saveWorkHistoryEntry: Function = (): void => {
    const { saveProfile, profile, ui } = this.props;
    saveProfile(employmentValidation, profile, ui).then(() => {
      this.closeWorkDialog();
    });
  };

  changeSwitchState: Function = (): void => {
    const { ui, setWorkHistoryEdit, profile, setShowWorkDeleteAllDialog } = this.props;
    if ( _.isEmpty(profile.work_history) ) {
      setWorkHistoryEdit(!ui.workHistoryEdit);
    } else {
      setShowWorkDeleteAllDialog(true);
    }
  };

  closeWorkDialog: Function = (): void => {
    const { setWorkDialogVisibility, clearProfileEdit } = this.props;
    setWorkDialogVisibility(false);
    clearProfileEdit();
  };

  addWorkHistoryEntry: Function = (): void => {
    const {
      updateProfile,
      profile,
      setWorkDialogIndex,
      setWorkDialogVisibility,
    } = this.props;
    let clone = Object.assign({}, profile, {
      work_history: profile.work_history.concat(generateNewWorkHistory())
    });
    updateProfile(clone);
    setWorkDialogIndex(clone.work_history.length - 1);
    setWorkDialogVisibility(true);
  };

  deleteWorkHistoryEntry: Function = (): void => {
    const { saveProfile, profile, ui, deletionIndex } = this.props;
    let clone = _.cloneDeep(profile);
    clone['work_history'].splice(deletionIndex, 1);
    saveProfile(employmentValidation, clone, ui);
  };

  deleteAllWorkHistoryEntries: Function = (): void => {
    const { saveProfile, profile, ui, setWorkHistoryEdit } = this.props;
    let clone = _.cloneDeep(profile);
    clone['work_history'] = [];
    saveProfile(employmentValidation, clone, ui);
    setWorkHistoryEdit(false);
  };

  closeConfirmDeleteAllDialog: Function = (): void => {
    const { setShowWorkDeleteAllDialog } = this.props;
    setShowWorkDeleteAllDialog(false);
  };

  editWorkHistoryForm(): React$Element {
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

  renderWorkHistory(): Array<React$Element|void>|void {
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
          <FABButton
            colored
            onClick={this.addWorkHistoryEntry}
            key="I'm unique!"
            className="profile-add-button">
            <Icon name="add" />
          </FABButton>
        );
      });
      return workHistoryRows;
    }
  }

  jobRow (position: WorkHistoryEntry, index: number) {
    const {
      setWorkDialogVisibility,
      setWorkDialogIndex,
      errors,
      profile,
    } = this.props;
    let editCallback = () => {
      setWorkDialogIndex(index);
      setWorkDialogVisibility(true);
    };
    let validationAlert = () => {
      if (_.get(errors, ['work_history', String(index)])) {
        return <IconButton name="error" onClick={editCallback} />;
      }
    };
    let dateFormat = date => moment(date).format("MM[/]YYYY");
    let endDateText = () => (
      _.isEmpty(position.end_date) ? "Current" : dateFormat(position.end_date)
    );
    let deleteEntry = () => this.openWorkDeleteDialog(index);
    let icons = () => {
      return userPrivilegeCheck(profile, 
        () => (
          <Cell col={2} className="profile-row-icons">
            {validationAlert()}
            <IconButton className="edit-button" name="edit" onClick={editCallback} />
            <IconButton className="delete-button" name="delete" onClick={deleteEntry} />
          </Cell>
        ),
        () => <Cell col={2} />
      );
    };
    return (
      <Grid className="profile-tab-card-grid" key={index}>
        <Cell col={4} className="profile-row-name">
          {`${position.company_name}, ${position.position}`}
        </Cell>
        <Cell col={6} className="profile-row-date-range">
          {`${dateFormat(position.start_date)} - ${endDateText()}`}
        </Cell>
        {icons()}
      </Grid>
    );
  }

  render () {
    const {
      ui: {
        workHistoryEdit,
        workDialogVisibility,
        showWorkDeleteDialog,
        showWorkDeleteAllDialog,
      },
      errors,
      showSwitch,
    } = this.props;
    const actions = [
      <Button
        type='button'
        key='cancel'
        className="cancel-button"
        onClick={this.closeWorkDialog}>
        Cancel
      </Button>,
      <Button
        key='save'
        type='button'
        className="save-button"
        onClick={this.saveWorkHistoryEntry}>
        Save
      </Button>,
    ];
    let workSwitch = () => {
      if ( showSwitch ) {
        return (
          <div>
            <Switch
              ripple
              id="profile-tab-professional-switch"
              onChange={this.changeSwitchState}
              checked={workHistoryEdit}>
            </Switch>
          </div>
        );
      }
    };
    let cardClass = () => (
      workHistoryEdit ? '' : 'profile-tab-card-greyed'
    );

    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteWorkHistoryEntry}
          open={showWorkDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          confirmText="Delete this entry?"
        />
        <ConfirmDeletion
          deleteFunc={this.deleteAllWorkHistoryEntries}
          open={showWorkDeleteAllDialog}
          close={this.closeConfirmDeleteAllDialog}
          confirmText="Delete all work history entries?"
        />
        <Dialog
          open={workDialogVisibility}
          className="dashboard-dialog employment-dashboard-dialog"
          onRequestClose={this.closeWorkDialog}
          actions={actions}
          autoScrollBodyContent={true}
        >
          {this.editWorkHistoryForm()}
        </Dialog>
        <Card shadow={1} className={`profile-tab-card ${cardClass()}`}>
          <Grid className="profile-tab-card-grid">
            <Cell col={4} className="profile-card-title">
              Employment
            </Cell>
            <Cell col={7}></Cell>
            <Cell col={1}>
              { workSwitch() }
            </Cell>
          </Grid>
          {this.renderWorkHistory()}
          <Grid className="profile-tab-card-grid">
            <Cell col={12}>
              <span className="validation-error-text-large">
                {errors.work_history_required}
              </span>
            </Cell>
          </Grid>
        </Card>
      </div>
    );
  }
}

export default EmploymentForm;
