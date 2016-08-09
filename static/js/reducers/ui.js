// @flow
/* global SETTINGS: false */
import { RECEIVE_GET_USER_PROFILE_SUCCESS } from '../actions';
import {
  CLEAR_UI,
  UPDATE_DIALOG_TEXT,
  UPDATE_DIALOG_TITLE,
  SET_DIALOG_VISIBILITY,

  SET_WORK_HISTORY_EDIT,
  SET_WORK_DIALOG_VISIBILITY,
  SET_WORK_DIALOG_INDEX,

  SET_EDUCATION_DIALOG_VISIBILITY,
  SET_EDUCATION_DIALOG_INDEX,
  SET_EDUCATION_DEGREE_LEVEL,
  SET_EDUCATION_DEGREE_INCLUSIONS,

  SET_USER_PAGE_DIALOG_VISIBILITY,

  SET_SHOW_EDUCATION_DELETE_DIALOG,
  SET_SHOW_WORK_DELETE_DIALOG,
  SET_DELETION_INDEX,
  SET_SHOW_WORK_DELETE_ALL_DIALOG,
  SET_SHOW_EDUCATION_DELETE_ALL_DIALOG,

  SET_PROFILE_STEP,
  SET_USER_MENU_OPEN,
  SET_SEARCH_FILTER_VISIBILITY,

  SET_TOS_DIALOG_VISIBILITY,
} from '../actions/ui';
import {
  HIGH_SCHOOL,
  ASSOCIATE,
  BACHELORS,
  MASTERS,
  DOCTORATE,
  PERSONAL_STEP,
} from '../constants';
import { calculateDegreeInclusions } from '../util/util';
import type { Action } from '../flow/reduxTypes';

export type UIState = {
  workHistoryEdit:              boolean;
  workDialogVisibility:         boolean;
  educationDialogVisibility:    boolean;
  educationDialogIndex:         number;
  educationDegreeLevel:         string;
  educationDegreeInclusions:    {[key: string]: boolean};
  userPageDialogVisibility:     boolean;
  showWorkDeleteDialog:         boolean;
  showEducationDeleteDialog:    boolean;
  deletionIndex:                ?number;
  dialog:                       {};
  showWorkDeleteAllDialog:      boolean;
  showEducationDeleteAllDialog: boolean;
  profileStep:                  string;
  workDialogIndex:              ?number;
  userMenuOpen:                 boolean;
  searchFilterVisibility:       {[s: string]: boolean};
  tosDialogVisibility:          boolean;
};

export const INITIAL_UI_STATE: UIState = {
  workHistoryEdit:            true,
  workDialogVisibility:       false,
  educationDialogVisibility:  false,
  educationDialogIndex:       -1,
  educationDegreeLevel:       '',
  educationDegreeInclusions: {
    [HIGH_SCHOOL]: false,
    [ASSOCIATE]: false,
    [BACHELORS]: false,
    [MASTERS]: false,
    [DOCTORATE]: false,
  },
  userPageDialogVisibility: false,
  showWorkDeleteDialog: false,
  showEducationDeleteDialog: false,
  deletionIndex: null,
  dialog: {},
  showWorkDeleteAllDialog: false,
  showEducationDeleteAllDialog: false,
  profileStep: PERSONAL_STEP,
  workDialogIndex:  null,
  userMenuOpen: false,
  searchFilterVisibility: {},
  tosDialogVisibility: false
};

export const ui = (state: UIState = INITIAL_UI_STATE, action: Action) => {
  switch (action.type) {
  case UPDATE_DIALOG_TEXT:
    return Object.assign({}, state, {
      dialog: Object.assign(
        {},
        state.dialog,
        { text: action.payload }
      )
    });
  case UPDATE_DIALOG_TITLE:
    return Object.assign({}, state, {
      dialog: Object.assign(
        {},
        state.dialog,
        { title: action.payload }
      )
    });
  case SET_DIALOG_VISIBILITY:
    return Object.assign({}, state, {
      dialog: Object.assign(
        {},
        state.dialog,
        { visible: action.payload }
      )
    });
  case SET_WORK_HISTORY_EDIT:
    return Object.assign({}, state, {
      workHistoryEdit: action.payload
    });
  case SET_WORK_DIALOG_VISIBILITY:
    return Object.assign({}, state, {
      workDialogVisibility: action.payload
    });
  case SET_WORK_DIALOG_INDEX:
    return Object.assign({}, state, {
      workDialogIndex: action.payload
    });
  case SET_EDUCATION_DIALOG_VISIBILITY:
    return Object.assign({}, state, {
      educationDialogVisibility: action.payload
    });
  case SET_EDUCATION_DIALOG_INDEX:
    return Object.assign({}, state, {
      educationDialogIndex: action.payload
    });
  case SET_EDUCATION_DEGREE_LEVEL:
    return Object.assign({}, state, {
      educationDegreeLevel: action.payload
    });
  case SET_EDUCATION_DEGREE_INCLUSIONS:
    return Object.assign({}, state, {
      educationDegreeInclusions: action.payload
    });
  case CLEAR_UI:
    return INITIAL_UI_STATE;
  case SET_USER_PAGE_DIALOG_VISIBILITY: {
    return Object.assign({}, state, {
      userPageDialogVisibility: action.payload
    });
  }
  case SET_SHOW_EDUCATION_DELETE_DIALOG: {
    return Object.assign({}, state, {
      showEducationDeleteDialog: action.payload
    });
  }
  case SET_SHOW_WORK_DELETE_DIALOG: {
    return Object.assign({}, state, {
      showWorkDeleteDialog: action.payload
    });
  }
  case SET_DELETION_INDEX: {
    return Object.assign({}, state, {
      deletionIndex: action.payload
    });
  }
  case RECEIVE_GET_USER_PROFILE_SUCCESS: {
    const { profile, username } = action.payload;
    if (SETTINGS.username === username) {
      return Object.assign({}, state, {
        educationDegreeInclusions: calculateDegreeInclusions(profile)
      });
    }
    return state;
  }
  case SET_SHOW_WORK_DELETE_ALL_DIALOG: {
    return Object.assign({}, state, {
      showWorkDeleteAllDialog: action.payload
    });
  }
  case SET_SHOW_EDUCATION_DELETE_ALL_DIALOG: {
    return Object.assign({}, state, {
      showEducationDeleteAllDialog: action.payload
    });
  }
  case SET_PROFILE_STEP: {
    return Object.assign({}, state, {
      profileStep: action.payload
    });
  }
  case SET_USER_MENU_OPEN: {
    return Object.assign({}, state, {
      userMenuOpen: action.payload
    });
  }
  case SET_SEARCH_FILTER_VISIBILITY: {
    return Object.assign({}, state, {
      searchFilterVisibility: action.payload
    });
  }
  case SET_TOS_DIALOG_VISIBILITY: {
    return Object.assign({}, state, {
      tosDialogVisibility: action.payload
    });
  }
  default:
    return state;
  }
};
