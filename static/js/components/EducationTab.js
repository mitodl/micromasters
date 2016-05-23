import React from 'react';
import Button from 'react-mdl/lib/Button';
import IconButton from 'react-mdl/lib/IconButton';
import _ from 'lodash';

import ProfileTab from "../util/ProfileTab";
import { generateNewEducation } from "../util/util";
import Grid, { Cell } from 'react-mdl/lib/Grid';
import Switch from 'react-mdl/lib/Switch';
import FABButton from 'react-mdl/lib/FABButton';
import Icon from 'react-mdl/lib/Icon';
import Dialog from 'material-ui/Dialog';
import { saveAndContinue } from '../util/profile_edit';

class EducationTab extends ProfileTab {
  constructor(props) {
    super(props);
    this.educationLevelLabels = {};
    this.educationLevelOptions.forEach(level => {
      this.educationLevelLabels[level.value] = level.label;
    });
  }
  nextUrl = "/profile/professional";

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

  static defaultProps = {
    requiredFields: [],
    validationMessages: {
      'degree_name': 'Degree level',
      'graduation_date': 'Graduation Date',
      'field_of_study': 'Field of study',
      'online_degree': 'Online Degree',
      'school_name': 'School name',
      'school_city': 'City',
      'school_state_or_territory': 'State',
      'school_country': 'Country'
    }
  };

  static nestedValidationKeys = [
    'degree_name',
    'graduation_date',
    'field_of_study',
    'online_degree',
    'school_name',
    'school_city',
    'school_state_or_territory',
    'school_country'
  ];

  static validation(profile, requiredFields) {
    let nestedFields = (index) => {
      let keySet = (key) => ['education', index, key];
      return EducationTab.nestedValidationKeys.map(key => keySet(key));
    };
    return requiredFields.concat(
      ...profile.education.map((v, i) => nestedFields(i))
    );
  }

  openNewEducationForm = (level, index) => {
    const {
      profile,
      updateProfile,
      setEducationDialogIndex,
      setEducationDegreeLevel,
      setEducationDialogVisibility,
    } = this.props;
    let newIndex = index;
    if (index === null){
      newIndex = profile['education'].length;
    }
    /* add empty education */
    let clone = Object.assign({}, profile);
    clone['education'] = clone['education'].concat(generateNewEducation(level));
    updateProfile(clone);
    setEducationDialogIndex(newIndex);
    setEducationDegreeLevel(level);
    setEducationDialogVisibility(true);
  }

  deleteEducationEntry = index => {
    const { updateProfile, profile } = this.props;
    let clone = _.cloneDeep(profile);
    clone['education'].splice(index, 1);
    updateProfile(clone);
  }

  printAddDegree(level){
    const { ui: { educationDegreeInclusions } } = this.props;
    if (educationDegreeInclusions[level.value]){
      let openForm = () => this.openNewEducationForm(level.value, null);
      return <Grid key={`add-${level.value}`}>
        <Cell col={11}></Cell>
        <Cell col={1}>
          <FABButton mini onClick={openForm} raised ripple>
            <Icon name="add" />
          </FABButton>
        </Cell>
      </Grid>;
    }
    return null;
  }

  printExistingEducations(level) {
    const { profile, errors } = this.props;
    let educationRow = (education, index) => {
      if (education.degree_name === level.value && 'id' in education) {
        let deleteEntry = () => this.deleteEducationEntry(index);
        let editEntry = () => (
          this.openEditEducationForm(education.degree_name, education.id)
        );
        let validationAlert = () => {
          if (_.get(errors, ['education', index])) {
            return <IconButton name="error" onClick={editEntry} />;
          }
        };
        return <Grid key={`education-row-${education.id}`} className="existing-education-grid">
          <Cell col={3}>{this.educationLevelLabels[education.degree_name]}</Cell>
          <Cell col={7}>{education.graduation_date}</Cell>
          <Cell col={2} className="education-icons">
            {validationAlert()}
            <IconButton name="edit" onClick={editEntry} />
            <IconButton name="delete" onClick={deleteEntry} />
          </Cell>
        </Grid>;
      }
    };
    return profile['education'].map(educationRow);
  }

  openEditEducationForm = (level, educationId) => {
    const {
      profile,
      setEducationDialogIndex,
      setEducationDegreeLevel,
      setEducationDialogVisibility,
    } = this.props;

    let index = profile['education'].findIndex((education) => {
      return educationId === education.id;
    });
    setEducationDialogIndex(index);
    setEducationDegreeLevel(level);
    setEducationDialogVisibility(true);
  }

  saveEducationForm = () => {
    saveAndContinue.call(this, EducationTab.validation).then(() => {
      this.clearEducationEdit();
    });
  }

  handleSwitchClick(level){
    const {
      ui: { educationDegreeInclusions },
      setEducationDegreeInclusions,
    } = this.props;
    let newState = Object.assign({}, educationDegreeInclusions);
    newState[level] = !educationDegreeInclusions[level];
    setEducationDegreeInclusions(newState);
  }

  clearEducationEdit = () => {
    const {
      setEducationDialogVisibility,
      setEducationDegreeLevel,
      setEducationDialogIndex,
      clearProfileEdit,
    } = this.props;
    setEducationDialogVisibility(false);
    setEducationDegreeLevel('');
    setEducationDialogIndex(null);
    clearProfileEdit();
  }

  render() {
    let {
      profile,
      ui: {
        educationDialogVisibility,
        educationDegreeInclusions,
        educationDialogIndex,
        educationDegreeLevel,
      }
    } = this.props;

    if (profile['education'] === undefined){
      return null;
    }

    let levelsGrid = this.educationLevelOptions.map(level =>{
      return <Cell col={12} key={level.value} >
        <Grid key={level.value} className="education-level-header">
          <Cell col={11}><h5 className="education-level-name">{level.label}</h5></Cell>
          <Cell col={1}>
            <Switch ripple onChange={()=>{this.handleSwitchClick(level.value);}}
              checked={educationDegreeInclusions[level.value]}/>
          </Cell>
        </Grid>
        { this.printAddDegree(level)}
        { this.printExistingEducations(level)}
      </Cell>;
    });

    let keySet = (key) =>['education', educationDialogIndex, key];

    let actions = [
      <Button key="save" type='button' onClick={this.saveEducationForm}>Save</Button>,
      <Button key="cancel" type='button' onClick={this.clearEducationEdit}>Cancel</Button>
    ];

    return <Grid className="profile-tab-grid">
      <Dialog
        open={educationDialogVisibility}
        className="dashboard-dialog"
        onRequestClose={this.clearEducationEdit}
        title={this.educationLevelLabels[educationDegreeLevel]}
        actions={actions}
        autoScrollBodyContent={true}
      >
        <Grid>
          <Cell col={6}>
            {this.boundTextField(keySet('field_of_study'), 'Field of Study')}
          </Cell>
          <Cell col={6}>
            {this.boundMonthYearField(keySet('graduation_date'), 'Graduation Date')}
          </Cell>
        </Grid>
        <Grid>
          <Cell col={6}>
            {this.boundTextField(keySet('school_name'), 'School Name')}
          </Cell>
          <Cell col={6}>
          </Cell>
        </Grid>
        <Grid>
          <Cell col={4}>
            {this.boundCountrySelectField(
              keySet('school_state_or_territory'),
              keySet('school_country'),
              'Country'
            )}
          </Cell>
          <Cell col={4}>
            {this.boundStateSelectField(
              keySet('school_state_or_territory'),
              keySet('school_country'),
              'State'
            )}
          </Cell>
          <Cell col={4}>
            {this.boundTextField(keySet('school_city'), 'City')}
          </Cell>
        </Grid>
      </Dialog>

      {levelsGrid}

     <Button raised onClick={this.saveAndContinue}>
        Save and continue
     </Button>
    </Grid>;
  }
}

export default EducationTab;
