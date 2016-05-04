import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import Button from 'react-mdl/lib/Button';
import dialogPolyfill from 'dialog-polyfill';

import ProfileTab from "../util/ProfileTab";
import { boundEducationSelectField,
  boundEducationMonthField, boundEducationYearField,
  saveAndContinue } from '../util/profile_edit';
import {
  toggleEducationLevel,
  openEducationForm,
  closeEducationForm
} from '../actions';
import { Grid, Cell, Switch, Dialog, DialogTitle, DialogContent, DialogActions, FABButton, Icon } from 'react-mdl';

class EducationTab extends ProfileTab {
  constructor(props) {
    super(props);
    this.boundEducationMonthField = boundEducationMonthField.bind(this);
    this.boundEducationYearField = boundEducationYearField.bind(this);
    this.educationLevelOptions = [
      { value: 'hs', label: "High school", enabled: true },
      { value: 'a', label: 'Associate degree', enabled: true },
      { value: 'b', label: "Bachelor's degree", enabled: true },
      { value: 'm', label: "Master's or professional degree", enabled: false },
      { value: 'p', label: "Doctorate", enabled: false }
    ];
    this.educationLevelLabels = {
      'hs': "High school",
      'a': 'Associate degree',
      'b': "Bachelor's degree",
      'm': "Master's or professional degree",
      'p': "Doctorate"
    };

    this.saveAndContinue = saveAndContinue.bind(this, '/dashboard');
    this.openNewEducationForm = this.openNewEducationForm.bind(this);
    this.handleCloseDialog = this.handleCloseDialog.bind(this);

  }

  componentDidMount() {
    // Use dialog polyfill to allow dialog usage on browsers other than Chrome and Opera (as of early 2016)
    const node = ReactDOM.findDOMNode(this);
    for (let dialog of node.querySelectorAll("dialog")) {
      dialogPolyfill.registerDialog(dialog);
    }
  }

  openNewEducationForm(level, index){
    const { dispatch, profile, updateProfile } = this.props;
    let new_index = index;
    if (index === null){
      new_index = profile['education'].length;
    }
    /* add empty education */
    let clone = Object.assign({}, profile);
    clone['education'].push(this.addNewEducation(level));
    updateProfile(clone);
    dispatch(openEducationForm(level, new_index));
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
  }
  printExistingEducations(level){
    const { profile } = this.props;
    return profile['education'].map(education => {
      if(education.degree_name === level.value && 'id' in education) {
        return <Grid className="existing-education-grid">
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
  openEditEducationForm(level, education_id){
    const { dispatch, profile } = this.props;
    let index = profile['education'].findIndex((education) => {
      return ('id' in education) && education_id === education.id;
    });
    dispatch(openEducationForm(level, index));

  }
  saveEducationForm(){
    const { dispatch, saveProfile, profile } = this.props;
    saveProfile(profile).then(() => {
      dispatch(closeEducationForm());
    });

  }
  handleSwitchClick(level){
    const {dispatch} = this.props;
    dispatch(toggleEducationLevel(level))

  }

  handleCloseDialog(){
    const { dispatch } = this.props;
    dispatch(closeEducationForm())
  }
  addNewEducation(level){
    return {
      'degree_name': level,
      'graduation_date': "",
      'field_of_study': "",
      'online_degree': false,
      'school_name': "",
      'school_city': "",
      'school_state_or_territory': "",
      'school_country': ""
    };
  }


  render() {
    let {educationDialog, educationLevels} = this.props;

    var levels_grid = this.educationLevelOptions.map(level =>{
      return <Cell col={12} key={level.value} >
        <Grid key={level.value} className="education-level-header">
          <Cell col={11} key="name"><h5 className="education-level-name">{level.label}</h5></Cell>
          <Cell col={1} key="switch">
            <Switch ripple id="switch1" onChange={()=>{this.handleSwitchClick(level.value)}}
                    checked={educationLevels[level.value]}/>
          </Cell>
        </Grid>
        { this.printAddDegree(level)}
        { this.printExistingEducations(level)}
        
      </Cell>
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
                {this.boundEducationMonthField(keySet('graduation_date'), 'MM')}
              </Cell>
              <Cell col={3}>
                {this.boundEducationYearField(keySet('graduation_date'), 'YYYY')}
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
            <Button type='button' onClick={()=>{this.saveEducationForm()}}>Save</Button>
            <Button type='button' onClick={this.handleCloseDialog}>Cancel</Button>
          </DialogActions>
        </Dialog>

      {levels_grid}

     <Button raised onClick={this.saveAndContinue}>
        Save and continue
     </Button>
    </Grid>;
  }
}

EducationTab.propTypes = {
  educationLevels: React.PropTypes.object,
  educationDialog: React.PropTypes.object,
  profile:        React.PropTypes.object,
  saveProfile:    React.PropTypes.func,
  updateProfile:  React.PropTypes.func,
  errors:         React.PropTypes.object,
  dispatch:       React.PropTypes.func.isRequired
};


const mapStateToProps = state => ({
  educationDialog: state.educationDialog,
  educationLevels: state.educationLevels
});

export default connect(mapStateToProps)(EducationTab);