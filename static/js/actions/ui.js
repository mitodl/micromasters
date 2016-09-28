// @flow
// general UI actions
import type { Dispatcher } from '../flow/reduxTypes';
import { createAction } from 'redux-actions';

export const CLEAR_UI = 'CLEAR_UI';
export const clearUI = createAction(CLEAR_UI);

export const UPDATE_DIALOG_TEXT = 'UPDATE_DIALOG_TEXT';
export const updateDialogText = createAction(UPDATE_DIALOG_TEXT);

export const UPDATE_DIALOG_TITLE = 'UPDATE_DIALOG_TITLE';
export const updateDialogTitle = createAction(UPDATE_DIALOG_TITLE);

export const SET_DIALOG_VISIBILITY = 'SET_DIALOG_VISIBILITY';
export const setDialogVisibility = createAction(SET_DIALOG_VISIBILITY);

// work history actions
export const SET_WORK_HISTORY_EDIT = 'SET_WORK_HISTORY_EDIT';
export const setWorkHistoryEdit = (bool: boolean): Dispatcher<null> => {
  return dispatch => {
    dispatch({ type: SET_WORK_HISTORY_EDIT, payload: bool});
    return Promise.resolve();
  };
};

export const SET_WORK_DIALOG_VISIBILITY = 'SET_WORK_DIALOG_VISIBILITY';
export const setWorkDialogVisibility = createAction(SET_WORK_DIALOG_VISIBILITY);

export const SET_WORK_DIALOG_INDEX = 'SET_WORK_DIALOG_INDEX';
export const setWorkDialogIndex = createAction(SET_WORK_DIALOG_INDEX);

export const SET_WORK_HISTORY_ANSWER = 'SET_WORK_HISTORY_ANSWER';
export const setWorkHistoryAnswer = createAction(SET_WORK_HISTORY_ANSWER);

// dashboard actions
export const TOGGLE_DASHBOARD_EXPANDER = 'TOGGLE_DASHBOARD_EXPANDER';
export const toggleDashboardExpander = createAction(TOGGLE_DASHBOARD_EXPANDER);

// education actions
export const SET_EDUCATION_DIALOG_VISIBILITY = 'SET_EDUCATION_DIALOG_VISIBILITY';
export const setEducationDialogVisibility = createAction(SET_EDUCATION_DIALOG_VISIBILITY);

export const SET_EDUCATION_DIALOG_INDEX = 'SET_EDUCATION_DIALOG_INDEX';
export const setEducationDialogIndex = createAction(SET_EDUCATION_DIALOG_INDEX);

export const SET_EDUCATION_DEGREE_LEVEL = 'SET_EDUCATION_DEGREE_LEVEL';
export const setEducationDegreeLevel = createAction(SET_EDUCATION_DEGREE_LEVEL);

export const SET_EDUCATION_LEVEL_ANSWERS = 'SET_EDUCATION_LEVEL_ANSWERS';
export const setEducationLevelAnswers = createAction(SET_EDUCATION_LEVEL_ANSWERS);

export const SET_USER_PAGE_DIALOG_VISIBILITY = 'SET_USER_PAGE_DIALOG_VISIBILITY';
export const setUserPageDialogVisibility = createAction(SET_USER_PAGE_DIALOG_VISIBILITY);

export const SET_SHOW_EDUCATION_DELETE_DIALOG = 'SET_SHOW_EDUCATION_DELETE_DIALOG';
export const setShowEducationDeleteDialog = createAction(SET_SHOW_EDUCATION_DELETE_DIALOG);

export const SET_SHOW_WORK_DELETE_DIALOG = 'SET_SHOW_WORK_DELETE_DIALOG';
export const setShowWorkDeleteDialog = createAction(SET_SHOW_WORK_DELETE_DIALOG);

export const SET_DELETION_INDEX = 'SET_DELETION_INDEX';
export const setDeletionIndex = createAction(SET_DELETION_INDEX);

export const SET_PROFILE_STEP = 'SET_PROFILE_STEP';
export const setProfileStep = createAction(SET_PROFILE_STEP);

export const SET_USER_MENU_OPEN = 'SET_USER_MENU_OPEN';
export const setUserMenuOpen = createAction(SET_USER_MENU_OPEN);

export const SET_SEARCH_FILTER_VISIBILITY = 'SET_SEARCH_FILTER_VISIBILITY';
export const setSearchFilterVisibility = createAction(SET_SEARCH_FILTER_VISIBILITY);

export const SET_EMAIL_DIALOG_VISIBILITY = 'SET_EMAIL_DIALOG_VISIBILITY';
export const setEmailDialogVisibility = createAction(SET_EMAIL_DIALOG_VISIBILITY);

export const SET_ENROLL_DIALOG_ERROR = 'SET_ENROLL_DIALOG_ERROR';
export const setEnrollDialogError = createAction(SET_ENROLL_DIALOG_ERROR);

export const SET_ENROLL_DIALOG_VISIBILITY = 'SET_ENROLL_DIALOG_VISIBILITY';
export const setEnrollDialogVisibility = createAction(SET_ENROLL_DIALOG_VISIBILITY);

export const SET_TOAST_MESSAGE = 'SET_TOAST_MESSAGE';
export const setToastMessage = createAction(SET_TOAST_MESSAGE);

export const SET_ENROLL_SELECTED_PROGRAM = 'SET_ENROLL_SELECTED_PROGRAM';
export const setEnrollSelectedProgram = createAction(SET_ENROLL_SELECTED_PROGRAM);

export const SET_PHOTO_DIALOG_VISIBILITY = 'SET_PHOTO_DIALOG_VISIBILITY';
export const setPhotoDialogVisibility = createAction(SET_PHOTO_DIALOG_VISIBILITY);

export const SET_CALCULATOR_DIALOG_VISIBILITY = 'SET_CALCULATOR_DIALOG_VISIBILITY';
export const setCalculatorDialogVisibility = createAction(SET_CALCULATOR_DIALOG_VISIBILITY);
