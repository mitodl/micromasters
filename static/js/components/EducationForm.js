// @flow
import React from 'react';
import IconButton from 'react-mdl/lib/IconButton';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card } from 'react-mdl/lib/Card';
import _ from 'lodash';
import moment from 'moment';
import Dialog from 'material-ui/Dialog';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import { educationValidation } from '../lib/validation/profile';
import { userPrivilegeCheck } from '../util/util';
import ProfileFormFields from '../util/ProfileFormFields';
import ConfirmDeletion from './ConfirmDeletion';
import FieldsOfStudySelectField from './inputs/FieldsOfStudySelectField';
import SelectField from './inputs/SelectField';
import CountrySelectField from './inputs/CountrySelectField';
import StateSelectField from './inputs/StateSelectField';
import {
  openEditEducationForm,
  openNewEducationForm,
  deleteEducationEntry,
} from '../util/profile_history_edit';
import { educationEntriesByDate } from '../util/sorting';
import {
  EDUCATION_LEVELS,
  HIGH_SCHOOL,
  BACHELORS,
  DASHBOARD_MONTH_FORMAT,
} from '../constants';
import type { Option } from '../flow/generalTypes';
import type {
  EducationEntry,
  Profile,
  ValidationErrors,
  SaveProfileFunc,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type {
  Validator,
  UIValidator,
} from '../lib/validation/profile';
import ValidationAlert from './ValidationAlert';

class EducationForm extends ProfileFormFields {
  constructor(props: Object) {
    super(props);

    this.educationLevelLabels = {};
    this.educationLevelOptions.forEach(level => {
      this.educationLevelLabels[level.value] = level.label;
    });
  }

  props: {
    profile:                          Profile,
    ui:                               UIState;
    updateProfile:                    UpdateProfileFunc,
    saveProfile:                      SaveProfileFunc,
    clearProfileEdit:                 () => void,
    errors:                           ValidationErrors,
    setDeletionIndex:                 (i: number) => void,
    setEducationDialogVisibility:     () => void,
    setEducationDialogIndex:          () => void,
    setEducationDegreeLevel:          () => void,
    setEducationLevelAnswers:         () => void,
    setShowEducationDeleteDialog:     (b: boolean) => void,
    showSwitch:                       boolean,
    validator:                        Validator|UIValidator,
  };

  educationLevelOptions: Array<Option> = EDUCATION_LEVELS;
  educationLevelLabels: Object;

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
    const { errors, profile } = this.props;
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
    let dateFormat = date => moment(date).format(DASHBOARD_MONTH_FORMAT);
    let degree = this.educationLevelOptions.find(level => (
      level.value === education.degree_name
    )).label;
    let icons = () => (
      <div className="profile-row-icons">
        {validationAlert()}
        <IconButton className="edit-button" name="edit" onClick={editEntry} />
        <IconButton className="delete-button" name="delete" onClick={deleteEntry} />
      </div>
    );
    return (
      <Cell col={12} className="profile-form-row row-padding" key={index}>
        <div className="col user-credentials">
          <div className="profile-row-name">
            <div className="school-type">{ degree }</div>
            <div className="school-name">{ education.school_name }</div>
          </div>
          </div>
        <div className="col user-credentials row-padding">
          <div className="profile-row-date-range">
            {`${dateFormat(education.graduation_date)}`}
          </div>
        </div>
        { userPrivilegeCheck(profile, icons, () => <div />) }
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

  clearEducationEdit: Function = (): void => {
    const {
      setEducationDialogVisibility,
      setEducationDegreeLevel,
      setEducationDialogIndex,
      clearProfileEdit,
      profile: { username },
    } = this.props;
    setEducationDialogVisibility(false);
    setEducationDegreeLevel('');
    setEducationDialogIndex(null);
    clearProfileEdit(username);
  };

  saveEducationForm: Function = (): void => {
    const { saveProfile, profile, ui } = this.props;
    saveProfile(educationValidation, profile, ui).then(() => {
      this.clearEducationEdit();
    });
  };

  renderEducationEntries: Function = (): React$Element<*>[] => {
    const { profile, profile: { education }} = this.props;
    let rows = [];
    if (education !== undefined) {
      let sorted = educationEntriesByDate(education);
      rows = sorted.map( ([index, entry]) => this.educationRow(entry, index));
    }
    userPrivilegeCheck(profile, () => {
      rows.push(
        <Cell col={12} className="profile-form-row add" key={"I'm unique!"}>
          <a
            className="mm-minor-action"
            onClick={() => this.openNewEducationForm(HIGH_SCHOOL, null)}
          >
            Add degree
          </a>
        </Cell>
      );
    });
    return rows;
  };

  openEducationDeleteDialog: Function = (index: number): void => {
    const { setDeletionIndex, setShowEducationDeleteDialog } = this.props;
    setDeletionIndex(index);
    setShowEducationDeleteDialog(true);
  };

  editEducationForm: Function = (): void => {
    const {
      ui: { educationDialogIndex },
      showSwitch,
      profile: { education },
    } = this.props;

    let educationDegreeLevel = _.get(education[educationDialogIndex], "degree_name") || BACHELORS;
    let keySet = (key) => ['education', educationDialogIndex, key];

    let fieldOfStudy = () => {
      if (educationDegreeLevel !== HIGH_SCHOOL) {
        return <Cell col={12}>
            <FieldsOfStudySelectField
              keySet={keySet('field_of_study')}
              label='Field of Study'
              {...this.defaultInputComponentProps()}
            />
          </Cell>;
      }
    };
    let levelForm = () => {
      if ( !showSwitch ) {
        return <Cell col={12}>
          <SelectField
            keySet={keySet('degree_name')}
            label='Degree Type'
            options={EDUCATION_LEVELS}
            {...this.defaultInputComponentProps()}
          />
        </Cell>;
      }
    };

    return <Grid className="profile-tab-grid">
      <Cell col={12} className="profile-form-title">
        {this.educationLevelLabels[educationDegreeLevel]}
      </Cell>
      { levelForm() }
      { fieldOfStudy() }
      <Cell col={7}>
        {this.boundTextField(keySet('school_name'), 'School Name')}
      </Cell>
      <Cell col={5}>
        {this.boundDateField(keySet('graduation_date'), 'Graduation Date', true, true)}
      </Cell>
      <Cell col={4}>
        <CountrySelectField
          stateKeySet={keySet('school_state_or_territory')}
          countryKeySet={keySet('school_country')}
          label='Country'
          {...this.defaultInputComponentProps()}
        />
      </Cell>
      <Cell col={4}>
        <StateSelectField
          stateKeySet={keySet('school_state_or_territory')}
          countryKeySet={keySet('school_country')}
          label='State'
          {...this.defaultInputComponentProps()}
        />
      </Cell>
      <Cell col={4} key="school_city">
        {this.boundTextField(keySet('school_city'), 'City')}
      </Cell>
    </Grid>;
  };

  renderCard() {
    const { showSwitch } = this.props;

    let cardClass = levelValue => (
      this.hasEducationAtLevel(levelValue) ? '' : 'collapsed'
    );

    if (showSwitch) {
      return this.educationLevelOptions.map(level => {
        return <Card shadow={1} className={`profile-form ${cardClass(level.value)}`} key={level.label}>
          <Grid className="profile-form-grid">
            {this.renderEducationLevel(level)}
          </Grid>
        </Card>;
      });
    } else {
      return <Card shadow={1} className="profile-form" id="education-card">
        <Grid className="profile-form-grid">
          <Cell col={12} className="profile-form-row profile-card-header">
            <span className="title">
              Education
            </span>
          </Cell>
        { this.renderEducationEntries() }
        </Grid>
      </Card>;
    }
  }

  render() {
    let {
      ui: {
        showEducationDeleteDialog,
        educationDialogVisibility,
      }
    } = this.props;

    const actions = <ValidationAlert {...this.props}>
      <Button
        type='button'
        className="secondary-button cancel-button"
        onClick={this.clearEducationEdit}>
        Cancel
      </Button>
      <Button
        type='button'
        className="primary-button save-button"
        onClick={this.saveEducationForm}>
        Save
      </Button>
    </ValidationAlert>;

    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteEducationEntry}
          open={showEducationDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          itemText="degree"
        />
        <Dialog
          title="Education"
          titleClassName="dialog-title"
          contentClassName="dialog education-dialog"
          className="education-dialog-wrapper"
          open={educationDialogVisibility}
          onRequestClose={this.clearEducationEdit}
          actions={actions}
          autoScrollBodyContent={true}
        >
          {this.editEducationForm()}
        </Dialog>
        {this.renderCard()}
      </div>
    );
  }
}

export default EducationForm;
