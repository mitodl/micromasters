// @flow
import _ from 'lodash';

import { generateNewEducation, generateNewWorkHistory } from "../util/util";
import { educationValidation, employmentValidation } from '../lib/validation/profile';

export function openEditEducationForm(index: number) {
  const {
    profile,
    setEducationDialogIndex,
    setEducationDegreeLevel,
    setEducationDialogVisibility,
  } = this.props;

  let education = profile['education'][index];
  setEducationDialogIndex(index);
  setEducationDegreeLevel(education.degree_name);
  setEducationDialogVisibility(true);
}

export function openNewEducationForm(level: string, index: number) {
  const {
    profile,
    updateProfile,
    setEducationDialogIndex,
    setEducationDegreeLevel,
    setEducationDialogVisibility,
    validator,
  } = this.props;
  let newIndex = index;
  if (index === null){
    newIndex = profile['education'].length;
  }
  /* add empty education */
  let clone = {
    ...profile,
    education: [...profile.education, generateNewEducation(level)]
  };
  updateProfile(clone, validator, true);
  setEducationDialogIndex(newIndex);
  setEducationDegreeLevel(level);
  setEducationDialogVisibility(true);
}

export function deleteEducationEntry () {
  const { saveProfile, profile, ui } = this.props;
  let clone = _.cloneDeep(profile);
  clone['education'].splice(ui.deletionIndex, 1);
  saveProfile(educationValidation, clone, ui);
}

export function openNewWorkHistoryForm () {
  const {
    updateProfile,
    profile,
    setWorkDialogIndex,
    setWorkDialogVisibility,
    validator,
  } = this.props;
  let clone = {
    ...profile,
    work_history: [...profile.work_history, generateNewWorkHistory()]
  };
  updateProfile(clone, validator, true);
  setWorkDialogIndex(clone.work_history.length - 1);
  setWorkDialogVisibility(true);
}

export function openEditWorkHistoryForm(index: number) {
  const {
    setWorkDialogVisibility,
    setWorkDialogIndex,
  } = this.props;
  setWorkDialogIndex(index);
  setWorkDialogVisibility(true);
}

export function deleteWorkHistoryEntry () {
  const { saveProfile, profile, ui } = this.props;
  let clone = _.cloneDeep(profile);
  clone['work_history'].splice(ui.deletionIndex, 1);
  saveProfile(employmentValidation, clone, ui);
}
