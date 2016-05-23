import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Card from 'react-mdl/lib/Card/Card';
import Button from 'react-mdl/lib/Button';
import Switch from 'react-mdl/lib/Switch';
import FABButton from 'react-mdl/lib/FABButton';
import Icon from 'react-mdl/lib/Icon';
import IconButton from 'react-mdl/lib/IconButton';
import _ from 'lodash';
import Dialog from 'material-ui/Dialog';
import moment from 'moment';

import { generateNewWorkHistory } from '../util/util';
import ProfileTab from "../util/ProfileTab";
import { saveAndContinue } from '../util/profile_edit';

class EmploymentTab extends ProfileTab {
  nextUrl = "/profile/privacy";

  static propTypes = {
    profile:            React.PropTypes.object,
    ui:                 React.PropTypes.object,
    saveProfile:        React.PropTypes.func,
    updateProfile:      React.PropTypes.func,
    setWorkHistoryEdit: React.PropTypes.func,
    setWorkDialogIndex: React.PropTypes.func,
  };

  static defaultProps = {
    requiredFields: [],
    validationMessages: {
      'position': 'Position',
      'industry': 'Industry',
      'company_name': 'Company Name',
      'start_date': 'Start Date',
      'city': 'City',
      'country': 'Country',
      'state_or_territory': 'State or Territory',
    },
  };

  static nestedValidationKeys = [
    'position',
    'industry',
    'company_name',
    'start_date',
    'city',
    'country',
    'state_or_territory',
  ];

  static validation (profile, requiredFields) {
    let nestedFields = (index) => {
      let keySet = (key) => ['work_history', index, key];
      return EmploymentTab.nestedValidationKeys.map(key => keySet(key));
    };

    return requiredFields.concat(
      ...profile.work_history.map( (v,i) => nestedFields(i))
    );
  }

  saveWorkHistoryEntry = () => {
    saveAndContinue.call(this, EmploymentTab.validation).then(() => {
      this.closeWorkDialog();
    });
  }

  componentWillMount () {
    const { profile, setWorkHistoryEdit } = this.props;
    if ( _.isArray(profile.work_history) && _.isEmpty(profile.work_history) ) {
      setWorkHistoryEdit(false);
    }
  }

  toggleWorkHistoryEdit = () => {
    const { ui, setWorkHistoryEdit } = this.props;
    setWorkHistoryEdit(!ui.workHistoryEdit);
  }

  closeWorkDialog = () => {
    const { setWorkDialogVisibility, clearProfileEdit } = this.props;
    setWorkDialogVisibility(false);
    clearProfileEdit();
  }

  addWorkHistoryEntry = () => {
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
  }

  deleteWorkHistoryEntry = index => {
    const { updateProfile, profile } = this.props;
    let clone = _.cloneDeep(profile);
    clone['work_history'].splice(index, 1);
    updateProfile(clone);
  }

  editWorkHistoryForm () {
    const { ui } = this.props;
    let keySet = (key) => ['work_history', ui.workDialogIndex, key];
    return (
      <Grid className="profile-tab-grid no-border">
        <Cell col={12} className="employment-form-title">
          Add Employment
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('company_name'), 'Company Name')}
        </Cell>
        <Cell col={4}>
          {this.boundCountrySelectField(keySet('state_or_territory'), keySet('country'), 'Country')}
        </Cell>
        <Cell col={4}>
          {this.boundStateSelectField(keySet('state_or_territory'), keySet('country'), 'State or Territory')}
        </Cell>
        <Cell col={4}>
          {this.boundTextField(keySet('city'), 'City')}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('industry'), 'Industry')}
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet('position'), 'Position')}
        </Cell>
        <Cell col={6}>
          {this.boundMonthYearField(keySet('start_date'), 'Start Date')}
        </Cell>
        <Cell col={6}>
          {this.boundMonthYearField(keySet('end_date'), 'End Date')}
          <span className="end-date-hint">
            Leave blank if this is a current position
          </span>
        </Cell>
      </Grid>
    );
  }

  renderWorkHistory () {
    const { ui, profile: { work_history } } = this.props;
    if ( ui.workHistoryEdit === true ) {
      let workHistoryRows = [];
      if ( !_.isUndefined(work_history) ) {
        workHistoryRows = work_history.map((entry, i) => this.jobRow(entry, i));
      }
      let fabSpacing = () => {
        let len = _.isArray(work_history) ? work_history.length : 0;
        switch ( len ) {
        case 0:
          return "no-entries";
        case 1:
          return "one-entry";
        default:
          return "more-entries";
        }
      };
      workHistoryRows.push(
        <FABButton
          colored
          onClick={this.addWorkHistoryEntry}
          key="I'm unique!"
          className={`add-employment-button ${fabSpacing()}`}>
          <Icon name="add" />
        </FABButton>
      );
      return workHistoryRows;
    } else {
      return (
        <Grid className="profile-tab-grid no-border">
          <Cell col={12} className="work-history-absent">
            No work history entered, click the switch to begin.
          </Cell>
        </Grid>
      );
    }
  }

  jobRow (position, index) {
    const {
      setWorkDialogVisibility,
      setWorkDialogIndex,
      errors,
    } = this.props;
    let editCallback = () => {
      setWorkDialogIndex(index);
      setWorkDialogVisibility(true);
    };
    let validationAlert = () => {
      if (_.get(errors, ['work_history', index])) {
        return <IconButton name="error" onClick={editCallback} />;
      }
    };
    let dateFormat = date => moment(date).format("MM[/]YYYY");
    let endDateText = () => (
      _.isEmpty(position.end_date) ? "Current" : dateFormat(position.end_date)
    );
    let deleteEntry = () => this.deleteWorkHistoryEntry(index);
    return (
      <Grid className="profile-tab-card-grid" key={index}>
        <Cell col={4} className="job-row company-name">
          {`${position.company_name}, ${position.position}`}
        </Cell>
        <Cell col={6} className="job-row company-date-range">
          {`${dateFormat(position.start_date)} - ${endDateText()}`}
        </Cell>
        <Cell col={2} className="job-row company-icons">
          {validationAlert()}
          <IconButton name="edit" onClick={editCallback} />
          <IconButton name="clear" onClick={deleteEntry} />
        </Cell>
      </Grid>
    );
  }

  render () {
    const { ui: { workHistoryEdit, workDialogVisibility } } = this.props;
    const actions = [
      <Button
        type='button'
        key='cancel'
        className="cancel-button work-button"
        onClick={this.closeWorkDialog}>
        Cancel
      </Button>,
      <Button
        key='save'
        type='button'
        className="save-button work-button"
        onClick={this.saveWorkHistoryEntry}>
        Save
      </Button>,
    ];

    return (
      <div id="employment-history">
        <Grid className="employment-splash">
          <Cell col={12}>
            Tell us about your employment.
          </Cell>
        </Grid>
        <Grid className="profile-tab-grid no-border">
          <Dialog
            open={workDialogVisibility}
            className="dashboard-dialog"
            onRequestClose={this.closeWorkDialog}
            actions={actions}
            autoScrollBodyContent={true}
          >
            {this.editWorkHistoryForm()}
          </Dialog>
          <Cell col={1}></Cell>
          <Cell col={10}>
            <Card shadow={1} className="profile-tab-card">
              <Grid className="profile-tab-card-grid">
                <Cell col={4} className="employment-title">
                  Employment
                </Cell>
                <Cell col={7}></Cell>
                <Cell col={1}>
                  <div>
                    <Switch
                      ripple
                      id="profile-tab-professional-switch"
                      onChange={this.toggleWorkHistoryEdit}
                      checked={workHistoryEdit}>
                    </Switch>
                  </div>
                </Cell>
              </Grid>
              {this.renderWorkHistory()}
            </Card>
          </Cell>
          <Cell col={1}></Cell>
          <Cell col={1}></Cell>
          <Cell col={10}>
            <Button
              raised
              colored
              className="profile-save-and-continue"
              onClick={this.saveAndContinue}>
              <span>Save and Continue</span>
            </Button>
          </Cell>
          <Cell col={1}></Cell>
        </Grid>
      </div>
    );
  }
}

export default EmploymentTab;
