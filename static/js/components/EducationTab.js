import React from 'react';
import { connect } from 'react-redux';
import Button from 'react-mdl/lib/Button';
import _ from 'lodash';

import ProfileTab from "../util/ProfileTab";
import { generateNewEducation } from "../util/util";
import {
  saveAndContinue
} from '../util/profile_edit';
import {
  doDialogPolyfill
} from '../util/util';
import {
  toggleEducationLevel,
  openEducationForm,
  closeEducationForm,
  clearProfileEdit
} from '../actions';
import { Grid, Cell, Switch, Dialog, DialogTitle, DialogContent, DialogActions, FABButton, Icon } from 'react-mdl';

class EducationTab extends ProfileTab {
  constructor(props) {
    super(props);

    this.educationLevelLabels = {};
    this.educationLevelOptions.forEach(level => {
      this.educationLevelLabels[level.value] = level.label;
    });
    this.saveAndContinue = saveAndContinue.bind(this, '/profile/professional', EducationTab.validation);
    this.openNewEducationForm = this.openNewEducationForm.bind(this);
    this.handleCloseDialog = this.handleCloseDialog.bind(this);

  }
  static propTypes ={
    educationLevels: React.PropTypes.object,
    educationDialog: React.PropTypes.object,
    profile: React.PropTypes.object,
    saveProfile: React.PropTypes.func,
    updateProfile: React.PropTypes.func,
    errors: React.PropTypes.object,
    dispatch: React.PropTypes.func.isRequired
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

  componentDidMount() {
    doDialogPolyfill.call(this);
  }

  openNewEducationForm(level, index) {
    const {dispatch, profile, updateProfile} = this.props;
    let newIndex = index;
    if (index === null){
      newIndex = profile['education'].length;
    }
    /* add empty education */
    let clone = Object.assign({}, profile);
    clone['education'] = clone['education'].concat(generateNewEducation(level));
    updateProfile(clone);
    dispatch(openEducationForm(level, newIndex));
  }

  printAddDegree(level){
    const { educationLevels } = this.props;
    if (educationLevels[level.value]){
      return <Grid key={"add-"+level.value}>
        <Cell col={11}></Cell>
        <Cell col={1}>
          <FABButton mini onClick={this.openNewEducationForm.bind(this, level.value, null )} raised ripple>
            <Icon name="add" />
          </FABButton>
        </Cell>
      </Grid>;
    }
    return null;
  }

  printExistingEducations(level) {
    const {profile} = this.props;
    return profile['education'].map(education => {
      if (education.degree_name === level.value && 'id' in education) {
        return <Grid key={"education-row-" + education.id} className="existing-education-grid">
          <Cell col={3}>{this.educationLevelLabels[education.degree_name]}</Cell>
          <Cell col={7}>{education.graduation_date}</Cell>
          <Cell col={1}>
            <Button onClick={this.openEditEducationForm.bind(this, education.degree_name, education.id)}>
              <Icon name="edit"/>
            </Button>
          </Cell>
          <Cell col={1}>
            <Button ><Icon name="delete"/></Button>
          </Cell>
        </Grid>;
      }
    });
  }

  openEditEducationForm(level, educationId){
    const { dispatch, profile } = this.props;

    let index = profile['education'].findIndex((education) => {
      return educationId === education.id;
    });
    dispatch(openEducationForm(level, index));
  }

  saveEducationForm(nestedValidationCallback){
    const { dispatch, saveProfile, profile, requiredFields, validationMessages } = this.props;
    let fields;
    if (_.isFunction(nestedValidationCallback)) {
      fields = nestedValidationCallback(profile, requiredFields);
    } else {
      fields = requiredFields;
    }
    saveProfile(profile, fields, validationMessages ).then(() => {
      dispatch(closeEducationForm());
    });
  }

  handleSwitchClick(level){
    const {dispatch, educationLevels} = this.props;
    let newState = Object.assign({}, educationLevels);
    newState[level] = !educationLevels[level];
    dispatch(toggleEducationLevel(newState));
  }

  handleCloseDialog(){
    const { dispatch } = this.props;
    dispatch(closeEducationForm());
    dispatch(clearProfileEdit());
  }

  render() {
    let { profile, educationDialog, educationLevels} = this.props;

    if (profile['education'] === undefined){
      return null;
    }

    let levelsGrid = this.educationLevelOptions.map(level =>{
      return <Cell col={12} key={level.value} >
        <Grid key={level.value} className="education-level-header">
          <Cell col={11}><h5 className="education-level-name">{level.label}</h5></Cell>
          <Cell col={1}>
            <Switch ripple onChange={()=>{this.handleSwitchClick(level.value);}}
              checked={educationLevels[level.value]}/>
          </Cell>
        </Grid>
        { this.printAddDegree(level)}
        { this.printExistingEducations(level)}
      </Cell>;
    });

    let keySet = (key) =>['education', educationDialog.educationIndex, key];

    return <Grid className="profile-tab-grid">
      <Dialog open={educationDialog.openDialog} className="profile-form-dialog" onCancel={this.handleCloseDialog}>
          <DialogTitle>{this.educationLevelLabels[educationDialog.degreeLevel]}</DialogTitle>
          <DialogContent>
            <Grid>
             <Cell col={6}>
               {this.boundTextField( keySet('field_of_study'), 'Field of Study')}
              </Cell>
              <Cell col={3}>
                {this.boundMonthField(keySet('graduation_date'), 'Month')}
              </Cell>
              <Cell col={3}>
                {this.boundYearField(keySet('graduation_date'), 'YYYY')}
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
                {this.boundTextField(keySet('school_city'), 'City')}
              </Cell>
              <Cell col={4}>
                {this.boundTextField(keySet('school_state_or_territory'), 'State')}
              </Cell>
              <Cell col={4}>
                {this.boundSelectField(keySet('school_country'), 'Country', this.countryOptions)}
              </Cell>
            </Grid>

          </DialogContent>
          <DialogActions>
            <Button type='button' onClick={()=>{this.saveEducationForm(EducationTab.validation);}}>Save</Button>
            <Button type='button' onClick={this.handleCloseDialog}>Cancel</Button>
          </DialogActions>
        </Dialog>

      {levelsGrid}

     <Button raised onClick={this.saveAndContinue}>
        Save and continue
     </Button>
    </Grid>;
  }
}


const mapStateToProps = state => ({
  educationDialog: state.educationDialog,
  educationLevels: state.educationLevels
});

export default connect(mapStateToProps)(EducationTab);
