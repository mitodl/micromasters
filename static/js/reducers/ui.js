// @flow
/* global SETTINGS: false */
import {
  CLEAR_UI,
  UPDATE_DIALOG_TEXT,
  UPDATE_DIALOG_TITLE,
  SET_DIALOG_VISIBILITY,

  SET_WORK_HISTORY_EDIT,
  SET_WORK_DIALOG_VISIBILITY,
  SET_WORK_DIALOG_INDEX,
  SET_WORK_HISTORY_ANSWER,

  SET_EDUCATION_DIALOG_VISIBILITY,
  SET_EDUCATION_DIALOG_INDEX,
  SET_EDUCATION_DEGREE_LEVEL,
  SET_EDUCATION_LEVEL_ANSWERS,

  SET_LEARNER_PAGE_DIALOG_VISIBILITY,
  SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY,

  SET_SHOW_EDUCATION_DELETE_DIALOG,
  SET_SHOW_WORK_DELETE_DIALOG,
  SET_DELETION_INDEX,

  SET_PROFILE_STEP,
  SET_USER_MENU_OPEN,
  SET_SEARCH_FILTER_VISIBILITY,

  SET_EMAIL_DIALOG_VISIBILITY,
  SET_PAYMENT_TEASER_DIALOG_VISIBILITY,

  SET_ENROLL_PROGRAM_DIALOG_ERROR,
  SET_ENROLL_PROGRAM_DIALOG_VISIBILITY,
  SET_TOAST_MESSAGE,
  SET_ENROLL_SELECTED_PROGRAM,

  SET_PHOTO_DIALOG_VISIBILITY,
  SET_CALCULATOR_DIALOG_VISIBILITY,
  SET_CONFIRM_SKIP_DIALOG_VISIBILITY,
  SET_CONFIRM_INCOME_DIALOG_VISIBILITY,
  SET_DOCS_INSTRUCTIONS_VISIBILITY,
  SET_COUPON_NOTIFICATION_VISIBILITY,
  SET_NAV_DRAWER_OPEN,
  SET_PROGRAM,
  SET_LEARNER_CHIP_VISIBILITY,
} from '../actions/ui';
import type { ToastMessage } from '../flow/generalTypes';
import type { Action } from '../flow/reduxTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';

export type UIDialog = {
  title?: string,
  text?: string,
  visible?: boolean,
};

export type UIState = {
  educationDialogVisibility:           boolean,
  educationDialogIndex:                number,
  educationDegreeLevel:                string,
  educationLevelAnswers:               {},
  workHistoryEdit:                     boolean,
  workDialogVisibility:                boolean,
  workHistoryAnswer:                   ?boolean,
  learnerPageDialogVisibility:         boolean,
  showWorkDeleteDialog:                boolean,
  learnerPageAboutMeDialogVisibility:  boolean,
  showEducationDeleteDialog:           boolean,
  deletionIndex:                       ?number,
  dialog:                              UIDialog,
  profileStep:                         ?string,
  workDialogIndex:                     ?number,
  userMenuOpen:                        boolean,
  searchFilterVisibility:              {[s: string]: boolean},
  tosDialogVisibility:                 boolean,
  emailDialogVisibility:               boolean,
  paymentTeaserDialogVisibility:       boolean,
  enrollProgramDialogError:            ?string,
  enrollProgramDialogVisibility:       boolean,
  toastMessage:                        ?ToastMessage,
  enrollSelectedProgram:               ?number,
  photoDialogVisibility:               boolean,
  calculatorDialogVisibility:          boolean,
  confirmIncomeDialogVisibility:       boolean,
  documentSentDate:                    Object,
  selectedProgram:                     ?AvailableProgram,
  skipDialogVisibility:                boolean,
  docsInstructionsVisibility:          boolean,
  couponNotificationVisibility:        boolean,
  navDrawerOpen:                       boolean,
  learnerChipVisibility:               ?string,
};

export const INITIAL_UI_STATE: UIState = {
  educationDialogVisibility:           false,
  educationDialogIndex:                -1,
  educationDegreeLevel:                '',
  educationLevelAnswers:               {},
  workHistoryEdit:                     true,
  workDialogVisibility:                false,
  workHistoryAnswer:                   null,
  learnerPageDialogVisibility:         false,
  learnerPageAboutMeDialogVisibility:  false,
  showWorkDeleteDialog:                false,
  showEducationDeleteDialog:           false,
  deletionIndex:                       null,
  dialog:                              {},
  profileStep:                         null,
  workDialogIndex:                     null,
  userMenuOpen:                        false,
  searchFilterVisibility:              {},
  tosDialogVisibility:                 false,
  emailDialogVisibility:               false,
  paymentTeaserDialogVisibility:       false,
  enrollProgramDialogError:            null,
  enrollProgramDialogVisibility:       false,
  toastMessage:                        null,
  enrollSelectedProgram:               null,
  photoDialogVisibility:               false,
  calculatorDialogVisibility:          false,
  confirmIncomeDialogVisibility:       false,
  documentSentDate:                    {},
  selectedProgram:                     null,
  skipDialogVisibility:                false,
  docsInstructionsVisibility:          false,
  couponNotificationVisibility:        false,
  navDrawerOpen:                       false,
  learnerChipVisibility:               null,
};

export const ui = (state: UIState = INITIAL_UI_STATE, action: Action) => {
  switch (action.type) {
  case UPDATE_DIALOG_TEXT:
    return {
      ...state,
      dialog: {
        ...state.dialog,
        text: action.payload,
      },
    };
  case UPDATE_DIALOG_TITLE:
    return {
      ...state,
      dialog: {
        ...state.dialog,
        title: action.payload,
      },
    };
  case SET_DIALOG_VISIBILITY:
    return {
      ...state,
      dialog: {
        ...state.dialog,
        visible: action.payload,
      },
    };
  case SET_PROGRAM:
    return {
      ...state,
      selectedProgram: action.payload,
    };
  case SET_WORK_HISTORY_EDIT:
    return {
      ...state,
      workHistoryEdit: action.payload,
    };
  case SET_WORK_DIALOG_VISIBILITY:
    return {
      ...state,
      workDialogVisibility: action.payload,
    };
  case SET_WORK_DIALOG_INDEX:
    return {
      ...state,
      workDialogIndex: action.payload,
    };
  case SET_WORK_HISTORY_ANSWER:
    return {
      ...state,
      workHistoryAnswer: action.payload,
    };
  case SET_EDUCATION_DIALOG_VISIBILITY:
    return {
      ...state,
      educationDialogVisibility: action.payload,
    };
  case SET_EDUCATION_DIALOG_INDEX:
    return {
      ...state,
      educationDialogIndex: action.payload,
    };
  case SET_EDUCATION_DEGREE_LEVEL:
    return {
      ...state,
      educationDegreeLevel: action.payload,
    };
  case SET_EDUCATION_LEVEL_ANSWERS:
    return {
      ...state,
      educationLevelAnswers: action.payload,
    };
  case CLEAR_UI:
    return INITIAL_UI_STATE;
  case SET_LEARNER_PAGE_DIALOG_VISIBILITY: {
    return {
      ...state,
      learnerPageDialogVisibility: action.payload,
    };
  }
  case SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY: {
    return {
      ...state,
      learnerPageAboutMeDialogVisibility: action.payload,
    };
  }
  case SET_SHOW_EDUCATION_DELETE_DIALOG: {
    return {
      ...state,
      showEducationDeleteDialog: action.payload,
    };
  }
  case SET_SHOW_WORK_DELETE_DIALOG: {
    return {
      ...state,
      showWorkDeleteDialog: action.payload,
    };
  }
  case SET_DELETION_INDEX: {
    return {
      ...state,
      deletionIndex: action.payload,
    };
  }
  case SET_PROFILE_STEP: {
    return {
      ...state,
      profileStep: action.payload,
    };
  }
  case SET_USER_MENU_OPEN: {
    return {
      ...state,
      userMenuOpen: action.payload,
    };
  }
  case SET_SEARCH_FILTER_VISIBILITY: {
    return {
      ...state,
      searchFilterVisibility: action.payload,
    };
  }
  case SET_EMAIL_DIALOG_VISIBILITY: {
    return {
      ...state,
      emailDialogVisibility: action.payload,
    };
  }
  case SET_PAYMENT_TEASER_DIALOG_VISIBILITY: {
    return {
      ...state,
      paymentTeaserDialogVisibility: action.payload,
    };
  }
  case SET_ENROLL_PROGRAM_DIALOG_ERROR: {
    return {
      ...state,
      enrollProgramDialogError: action.payload,
    };
  }
  case SET_TOAST_MESSAGE: {
    return {
      ...state,
      toastMessage: action.payload,
    };
  }
  case SET_ENROLL_SELECTED_PROGRAM: {
    return {
      ...state,
      enrollSelectedProgram: action.payload,
    };
  }
  case SET_ENROLL_PROGRAM_DIALOG_VISIBILITY: {
    return {
      ...state,
      enrollProgramDialogVisibility: action.payload
    };
  }
  case SET_PHOTO_DIALOG_VISIBILITY:
    return { ...state, photoDialogVisibility: action.payload };
  case SET_CALCULATOR_DIALOG_VISIBILITY:
    return { ...state, calculatorDialogVisibility: action.payload };
  case SET_CONFIRM_SKIP_DIALOG_VISIBILITY:
    return { ...state, skipDialogVisibility: action.payload };
  case SET_CONFIRM_INCOME_DIALOG_VISIBILITY:
    return { ...state, confirmIncomeDialogVisibility: action.payload };
  case SET_DOCS_INSTRUCTIONS_VISIBILITY:
    return { ...state, docsInstructionsVisibility: action.payload };
  case SET_COUPON_NOTIFICATION_VISIBILITY:
    return { ...state, couponNotificationVisibility: action.payload };
  case SET_NAV_DRAWER_OPEN:
    return { ...state, navDrawerOpen: action.payload };
  case SET_LEARNER_CHIP_VISIBILITY:
    return { ...state, learnerChipVisibility: action.payload };
  default:
    return state;
  }
};
