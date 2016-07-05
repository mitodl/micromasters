// @flow
// general UI actions
import type { Action } from '../flow/generalTypes';

export const CLEAR_UI = 'CLEAR_UI';
export const clearUI = () => ({ type: CLEAR_UI });

export const UPDATE_DIALOG_TEXT = 'UPDATE_DIALOG_TEXT';
export const updateDialogText = (text: string): Action => (
  { type: UPDATE_DIALOG_TEXT, payload: text }
);

export const UPDATE_DIALOG_TITLE = 'UPDATE_DIALOG_TITLE';
export const updateDialogTitle = (title: string): Action => (
  { type: UPDATE_DIALOG_TITLE, payload: title }
);

export const SET_DIALOG_VISIBILITY = 'SET_DIALOG_VISIBILITY';
export const setDialogVisibility = (bool: boolean): Action => (
  { type: SET_DIALOG_VISIBILITY, payload: bool }
);

// work history actions
export const SET_WORK_HISTORY_EDIT = 'SET_WORK_HISTORY_EDIT';
export const setWorkHistoryEdit = (bool: boolean): Action => (
  { type: SET_WORK_HISTORY_EDIT, payload: bool }
);

export const SET_WORK_DIALOG_VISIBILITY = 'SET_WORK_DIALOG_VISIBILITY';
export const setWorkDialogVisibility = (bool: boolean): Action => (
  { type: SET_WORK_DIALOG_VISIBILITY, payload: bool }
);

export const SET_WORK_DIALOG_INDEX = 'SET_WORK_DIALOG_INDEX';
export const setWorkDialogIndex = (index: number): Action => (
  { type: SET_WORK_DIALOG_INDEX, payload: index }
);

// dashboard actions
export const TOGGLE_DASHBOARD_EXPANDER = 'TOGGLE_DASHBOARD_EXPANDER';
export const toggleDashboardExpander = (courseId: number, newValue: boolean): Action => ({
  type: TOGGLE_DASHBOARD_EXPANDER,
  payload: { courseId, newValue }
});

// education actions
export const SET_EDUCATION_DIALOG_VISIBILITY = 'SET_EDUCATION_DIALOG_VISIBILITY';
export const setEducationDialogVisibility = (bool: boolean): Action => (
  { type: SET_EDUCATION_DIALOG_VISIBILITY, payload: bool }
);

export const SET_EDUCATION_DIALOG_INDEX = 'SET_EDUCATION_DIALOG_INDEX';
export const setEducationDialogIndex = (index: number): Action => (
  { type: SET_EDUCATION_DIALOG_INDEX, payload: index }
);

export const SET_EDUCATION_DEGREE_LEVEL = 'SET_EDUCATION_DEGREE_LEVEL';
export const setEducationDegreeLevel = (level: string): Action => (
  { type: SET_EDUCATION_DEGREE_LEVEL, payload: level }
);

export const SET_EDUCATION_DEGREE_INCLUSIONS = 'SET_EDUCATION_DEGREE_INCLUSIONS';
export const setEducationDegreeInclusions = (degreeInclusions: Object): Action => (
  { type: SET_EDUCATION_DEGREE_INCLUSIONS, payload: degreeInclusions }
);

export const SET_USER_PAGE_DIALOG_VISIBILITY = 'SET_USER_PAGE_DIALOG_VISIBILITY';
export const setUserPageDialogVisibility = (bool: boolean): Action => (
  { type: SET_USER_PAGE_DIALOG_VISIBILITY, payload: bool }
);

export const SET_SHOW_EDUCATION_DELETE_DIALOG = 'SET_SHOW_EDUCATION_DELETE_DIALOG';
export const setShowEducationDeleteDialog = (bool: boolean): Action => (
  { type: SET_SHOW_EDUCATION_DELETE_DIALOG, payload: bool }
);

export const SET_SHOW_WORK_DELETE_DIALOG = 'SET_SHOW_WORK_DELETE_DIALOG';
export const setShowWorkDeleteDialog = (bool: boolean): Action => (
  { type: SET_SHOW_WORK_DELETE_DIALOG, payload: bool }
);

export const SET_DELETION_INDEX = 'SET_DELETION_INDEX';
export const setDeletionIndex = (index: number): Action => (
  { type: SET_DELETION_INDEX, payload: index }
);

export const SET_SHOW_WORK_DELETE_ALL_DIALOG = 'SET_SHOW_WORK_DELETE_ALL_DIALOG';
export const setShowWorkDeleteAllDialog = (bool: boolean): Action => (
  { type: SET_SHOW_WORK_DELETE_ALL_DIALOG, payload: bool }
);

export const SET_SHOW_EDUCATION_DELETE_ALL_DIALOG = 'SET_SHOW_EDUCATION_DELETE_ALL_DIALOG';
export const setShowEducationDeleteAllDialog = (bool: boolean): Action => (
  { type: SET_SHOW_EDUCATION_DELETE_ALL_DIALOG, payload: bool }
);

export const SET_PROFILE_STEP = 'SET_PROFILE_STEP';
export const setProfileStep = (step: string): Action => (
  { type: SET_PROFILE_STEP, payload: step }
);
