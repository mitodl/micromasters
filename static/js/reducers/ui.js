// @flow
/* global SETTINGS: false */
import {
  CLEAR_UI,
  SHOW_DIALOG,
  HIDE_DIALOG,
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
  SET_SEARCH_FILTER_VISIBILITY,
  SET_EMAIL_DIALOG_VISIBILITY,
  SET_PAYMENT_TEASER_DIALOG_VISIBILITY,
  SET_ENROLL_PROGRAM_DIALOG_ERROR,
  SET_ENROLL_PROGRAM_DIALOG_VISIBILITY,
  SET_ENROLL_COURSE_DIALOG_VISIBILITY,
  SET_CALCULATE_PRICE_DIALOG_VISIBILITY,
  SET_TOAST_MESSAGE,
  SET_ENROLL_SELECTED_PROGRAM,
  SET_ENROLL_SELECTED_COURSE_RUN,
  SET_CONFIRM_SKIP_DIALOG_VISIBILITY,
  SET_DOCS_INSTRUCTIONS_VISIBILITY,
  SET_COUPON_NOTIFICATION_VISIBILITY,
  SET_NAV_DRAWER_OPEN,
  SET_PROGRAM,
  SHOW_ENROLL_PAY_LATER_SUCCESS,
  SET_SHOW_EXPANDED_COURSE_STATUS,
  SET_PROGRAMS_TO_UNENROLL,
  SET_UNENROLL_API_INFLIGHT_STATE
} from "../actions/ui"
import { EMAIL_COMPOSITION_DIALOG } from "../components/email/constants"
import { CHANNEL_CREATE_DIALOG } from "../constants"
import type { ToastMessage } from "../flow/generalTypes"
import type { Action } from "../flow/reduxTypes"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import type { CourseRun } from "../flow/programTypes"

export type UIDialog = {
  title?: string,
  text?: string,
  visible?: boolean
}

export type DialogVisibilityState = { [dialogName: string]: boolean }

export const INITIAL_DIALOG_VISIBILITY_STATE = {
  [EMAIL_COMPOSITION_DIALOG]: false,
  [CHANNEL_CREATE_DIALOG]:    false
}

export type UIState = {
  educationDialogVisibility: boolean,
  educationDialogIndex: number,
  educationDegreeLevel: string,
  educationLevelAnswers: {},
  workHistoryEdit: boolean,
  workDialogVisibility: boolean,
  workHistoryAnswer: ?boolean,
  learnerPageDialogVisibility: boolean,
  showWorkDeleteDialog: boolean,
  learnerPageAboutMeDialogVisibility: boolean,
  showEducationDeleteDialog: boolean,
  deletionIndex: ?number,
  dialog: UIDialog,
  profileStep: ?string,
  workDialogIndex: ?number,
  searchFilterVisibility: { [s: string]: boolean },
  tosDialogVisibility: boolean,
  emailDialogVisibility: boolean,
  paymentTeaserDialogVisibility: boolean,
  enrollProgramDialogError: ?string,
  enrollProgramDialogVisibility: boolean,
  enrollCourseDialogVisibility: boolean,
  calculatePriceDialogVisibility: boolean,
  toastMessage: ?ToastMessage,
  enrollSelectedProgram: ?number,
  enrollSelectedCourseRun: ?CourseRun,
  confirmIncomeDialogVisibility: boolean,
  documentSentDate: Object,
  selectedProgram: ?AvailableProgram,
  skipDialogVisibility: boolean,
  docsInstructionsVisibility: boolean,
  couponNotificationVisibility: boolean,
  navDrawerOpen: boolean,
  dialogVisibility: DialogVisibilityState,
  showEnrollPayLaterSuccess: ?string,
  expandedCourseStatuses: Set<number>,
  programsToUnEnroll: Array<number>,
  programsToUnEnrollInFlight: boolean
}

export const INITIAL_UI_STATE: UIState = {
  educationDialogVisibility:          false,
  educationDialogIndex:               -1,
  educationDegreeLevel:               "",
  educationLevelAnswers:              {},
  workHistoryEdit:                    true,
  workDialogVisibility:               false,
  workHistoryAnswer:                  null,
  learnerPageDialogVisibility:        false,
  learnerPageAboutMeDialogVisibility: false,
  showWorkDeleteDialog:               false,
  showEducationDeleteDialog:          false,
  deletionIndex:                      null,
  dialog:                             {},
  profileStep:                        null,
  workDialogIndex:                    null,
  searchFilterVisibility:             {},
  tosDialogVisibility:                false,
  emailDialogVisibility:              false,
  paymentTeaserDialogVisibility:      false,
  enrollProgramDialogError:           null,
  enrollProgramDialogVisibility:      false,
  enrollCourseDialogVisibility:       false,
  calculatePriceDialogVisibility:     false,
  toastMessage:                       null,
  enrollSelectedProgram:              null,
  enrollSelectedCourseRun:            null,
  confirmIncomeDialogVisibility:      false,
  documentSentDate:                   {},
  selectedProgram:                    null,
  skipDialogVisibility:               false,
  docsInstructionsVisibility:         false,
  couponNotificationVisibility:       false,
  navDrawerOpen:                      false,
  dialogVisibility:                   INITIAL_DIALOG_VISIBILITY_STATE,
  showEnrollPayLaterSuccess:          null,
  expandedCourseStatuses:             new Set(),
  programsToUnEnroll:                 [],
  programsToUnEnrollInFlight:         false
}

export const ui = (
  state: UIState = INITIAL_UI_STATE,
  action: Action<any, null>
) => {
  switch (action.type) {
  case SHOW_DIALOG:
    return {
      ...state,
      dialogVisibility: {
        ...state.dialogVisibility,
        [action.payload]: true
      }
    }
  case HIDE_DIALOG:
    return {
      ...state,
      dialogVisibility: {
        ...state.dialogVisibility,
        [action.payload]: false
      }
    }
  case SET_PROGRAM:
    return {
      ...state,
      selectedProgram: action.payload
    }
  case SET_WORK_HISTORY_EDIT:
    return {
      ...state,
      workHistoryEdit: action.payload
    }
  case SET_WORK_DIALOG_VISIBILITY:
    return {
      ...state,
      workDialogVisibility: action.payload
    }
  case SET_WORK_DIALOG_INDEX:
    return {
      ...state,
      workDialogIndex: action.payload
    }
  case SET_WORK_HISTORY_ANSWER:
    return {
      ...state,
      workHistoryAnswer: action.payload
    }
  case SET_EDUCATION_DIALOG_VISIBILITY:
    return {
      ...state,
      educationDialogVisibility: action.payload
    }
  case SET_EDUCATION_DIALOG_INDEX:
    return {
      ...state,
      educationDialogIndex: action.payload
    }
  case SET_EDUCATION_DEGREE_LEVEL:
    return {
      ...state,
      educationDegreeLevel: action.payload
    }
  case SET_EDUCATION_LEVEL_ANSWERS:
    return {
      ...state,
      educationLevelAnswers: action.payload
    }
  case CLEAR_UI:
    return INITIAL_UI_STATE
  case SET_LEARNER_PAGE_DIALOG_VISIBILITY: {
    return {
      ...state,
      learnerPageDialogVisibility: action.payload
    }
  }
  case SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY: {
    return {
      ...state,
      learnerPageAboutMeDialogVisibility: action.payload
    }
  }
  case SET_SHOW_EDUCATION_DELETE_DIALOG: {
    return {
      ...state,
      showEducationDeleteDialog: action.payload
    }
  }
  case SET_SHOW_WORK_DELETE_DIALOG: {
    return {
      ...state,
      showWorkDeleteDialog: action.payload
    }
  }
  case SET_DELETION_INDEX: {
    return {
      ...state,
      deletionIndex: action.payload
    }
  }
  case SET_PROFILE_STEP: {
    return {
      ...state,
      profileStep: action.payload
    }
  }
  case SET_SEARCH_FILTER_VISIBILITY: {
    return {
      ...state,
      searchFilterVisibility: action.payload
    }
  }
  case SET_EMAIL_DIALOG_VISIBILITY: {
    return {
      ...state,
      emailDialogVisibility: action.payload
    }
  }
  case SET_PAYMENT_TEASER_DIALOG_VISIBILITY: {
    return {
      ...state,
      paymentTeaserDialogVisibility: action.payload
    }
  }
  case SET_ENROLL_PROGRAM_DIALOG_ERROR: {
    return {
      ...state,
      enrollProgramDialogError: action.payload
    }
  }
  case SET_TOAST_MESSAGE: {
    return {
      ...state,
      toastMessage: action.payload
    }
  }
  case SET_ENROLL_SELECTED_PROGRAM: {
    return {
      ...state,
      enrollSelectedProgram: action.payload
    }
  }
  case SET_ENROLL_SELECTED_COURSE_RUN: {
    return {
      ...state,
      enrollSelectedCourseRun: action.payload
    }
  }
  case SET_ENROLL_PROGRAM_DIALOG_VISIBILITY: {
    return {
      ...state,
      enrollProgramDialogVisibility: action.payload
    }
  }
  case SET_ENROLL_COURSE_DIALOG_VISIBILITY: {
    return {
      ...state,
      enrollCourseDialogVisibility: action.payload
    }
  }
  case SET_CALCULATE_PRICE_DIALOG_VISIBILITY: {
    return {
      ...state,
      calculatePriceDialogVisibility: action.payload
    }
  }
  case SHOW_ENROLL_PAY_LATER_SUCCESS: {
    return {
      ...state,
      showEnrollPayLaterSuccess: action.payload
    }
  }
  case SET_CONFIRM_SKIP_DIALOG_VISIBILITY:
    return { ...state, skipDialogVisibility: action.payload }
  case SET_DOCS_INSTRUCTIONS_VISIBILITY:
    return { ...state, docsInstructionsVisibility: action.payload }
  case SET_COUPON_NOTIFICATION_VISIBILITY:
    return { ...state, couponNotificationVisibility: action.payload }
  case SET_NAV_DRAWER_OPEN:
    return { ...state, navDrawerOpen: action.payload }
  case SET_SHOW_EXPANDED_COURSE_STATUS:
    return {
      ...state,
      expandedCourseStatuses: new Set(state.expandedCourseStatuses).add(
        action.payload
      )
    }
  case SET_PROGRAMS_TO_UNENROLL:
    return {
      ...state,
      programsToUnEnroll: action.payload
    }
  case SET_UNENROLL_API_INFLIGHT_STATE:
    return {
      ...state,
      programsToUnEnrollInFlight: action.payload
    }
  default:
    return state
  }
}
