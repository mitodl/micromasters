// @flow
// general UI actions
import type { Dispatcher } from "../flow/reduxTypes"
import { createAction } from "redux-actions"

export const CLEAR_UI = "CLEAR_UI"
export const clearUI = createAction(CLEAR_UI)

export const SHOW_DIALOG = "SHOW_DIALOG"
export const showDialog = createAction(SHOW_DIALOG)

export const HIDE_DIALOG = "HIDE_DIALOG"
export const hideDialog = createAction(HIDE_DIALOG)

// work history actions
export const SET_WORK_HISTORY_EDIT = "SET_WORK_HISTORY_EDIT"
export const setWorkHistoryEdit = (bool: boolean): Dispatcher<void> => {
  return dispatch => {
    dispatch({ type: SET_WORK_HISTORY_EDIT, payload: bool })
    return Promise.resolve()
  }
}

export const SET_WORK_DIALOG_VISIBILITY = "SET_WORK_DIALOG_VISIBILITY"
export const setWorkDialogVisibility = createAction(SET_WORK_DIALOG_VISIBILITY)

export const SET_WORK_DIALOG_INDEX = "SET_WORK_DIALOG_INDEX"
export const setWorkDialogIndex = createAction(SET_WORK_DIALOG_INDEX)

export const SET_WORK_HISTORY_ANSWER = "SET_WORK_HISTORY_ANSWER"
export const setWorkHistoryAnswer = createAction(SET_WORK_HISTORY_ANSWER)

// dashboard actions
export const TOGGLE_DASHBOARD_EXPANDER = "TOGGLE_DASHBOARD_EXPANDER"
export const toggleDashboardExpander = createAction(TOGGLE_DASHBOARD_EXPANDER)

// education actions
export const SET_EDUCATION_DIALOG_VISIBILITY = "SET_EDUCATION_DIALOG_VISIBILITY"
export const setEducationDialogVisibility = createAction(
  SET_EDUCATION_DIALOG_VISIBILITY
)

export const SET_EDUCATION_DIALOG_INDEX = "SET_EDUCATION_DIALOG_INDEX"
export const setEducationDialogIndex = createAction(SET_EDUCATION_DIALOG_INDEX)

export const SET_EDUCATION_DEGREE_LEVEL = "SET_EDUCATION_DEGREE_LEVEL"
export const setEducationDegreeLevel = createAction(SET_EDUCATION_DEGREE_LEVEL)

export const SET_EDUCATION_LEVEL_ANSWERS = "SET_EDUCATION_LEVEL_ANSWERS"
export const setEducationLevelAnswers = createAction(
  SET_EDUCATION_LEVEL_ANSWERS
)

export const SET_LEARNER_PAGE_DIALOG_VISIBILITY =
  "SET_LEARNER_PAGE_DIALOG_VISIBILITY"
export const setLearnerPageDialogVisibility = createAction(
  SET_LEARNER_PAGE_DIALOG_VISIBILITY
)

export const SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY =
  "SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY"
export const setLearnerPageAboutMeDialogVisibility = createAction(
  SET_LEARNER_PAGE_ABOUT_ME_DIALOG_VISIBILITY
)

export const SET_SHOW_EDUCATION_DELETE_DIALOG =
  "SET_SHOW_EDUCATION_DELETE_DIALOG"
export const setShowEducationDeleteDialog = createAction(
  SET_SHOW_EDUCATION_DELETE_DIALOG
)

export const SET_SHOW_WORK_DELETE_DIALOG = "SET_SHOW_WORK_DELETE_DIALOG"
export const setShowWorkDeleteDialog = createAction(SET_SHOW_WORK_DELETE_DIALOG)

export const SET_DELETION_INDEX = "SET_DELETION_INDEX"
export const setDeletionIndex = createAction(SET_DELETION_INDEX)

export const SET_PROFILE_STEP = "SET_PROFILE_STEP"
export const setProfileStep = createAction(SET_PROFILE_STEP)

export const SET_SEARCH_FILTER_VISIBILITY = "SET_SEARCH_FILTER_VISIBILITY"
export const setSearchFilterVisibility = createAction(
  SET_SEARCH_FILTER_VISIBILITY
)

export const SET_EMAIL_DIALOG_VISIBILITY = "SET_EMAIL_DIALOG_VISIBILITY"
export const setEmailDialogVisibility = createAction(
  SET_EMAIL_DIALOG_VISIBILITY
)

export const SET_ENROLL_PROGRAM_DIALOG_ERROR = "SET_ENROLL_PROGRAM_DIALOG_ERROR"
export const setEnrollProgramDialogError = createAction(
  SET_ENROLL_PROGRAM_DIALOG_ERROR
)

export const SET_PAYMENT_TEASER_DIALOG_VISIBILITY =
  "SET_PAYMENT_TEASER_DIALOG_VISIBILITY"
export const setPaymentTeaserDialogVisibility = createAction(
  SET_PAYMENT_TEASER_DIALOG_VISIBILITY
)

export const SET_ENROLL_PROGRAM_DIALOG_VISIBILITY =
  "SET_ENROLL_PROGRAM_DIALOG_VISIBILITY"
export const setEnrollProgramDialogVisibility = createAction(
  SET_ENROLL_PROGRAM_DIALOG_VISIBILITY
)

export const SET_ENROLL_COURSE_DIALOG_VISIBILITY =
  "SET_ENROLL_COURSE_DIALOG_VISIBILITY"
export const setEnrollCourseDialogVisibility = createAction(
  SET_ENROLL_COURSE_DIALOG_VISIBILITY
)

export const SET_CALCULATE_PRICE_DIALOG_VISIBILITY =
  "SET_CALCULATE_PRICE_DIALOG_VISIBILITY"
export const setCalculatePriceDialogVisibility = createAction(
  SET_CALCULATE_PRICE_DIALOG_VISIBILITY
)

export const SET_TOAST_MESSAGE = "SET_TOAST_MESSAGE"
export const setToastMessage = createAction(SET_TOAST_MESSAGE)

export const SET_ENROLL_SELECTED_PROGRAM = "SET_ENROLL_SELECTED_PROGRAM"
export const setEnrollSelectedProgram = createAction(
  SET_ENROLL_SELECTED_PROGRAM
)

export const SET_ENROLL_SELECTED_COURSE_RUN = "SET_ENROLL_SELECTED_COURSE_RUN"
export const setEnrollSelectedCourseRun = createAction(
  SET_ENROLL_SELECTED_COURSE_RUN
)

export const SET_PROGRAM = "SET_PROGRAM"
export const setProgram = createAction(SET_PROGRAM)

export const SET_CONFIRM_SKIP_DIALOG_VISIBILITY =
  "SET_CONFIRM_SKIP_DIALOG_VISIBILITY"
export const setConfirmSkipDialogVisibility = createAction(
  SET_CONFIRM_SKIP_DIALOG_VISIBILITY
)

export const SET_DOCS_INSTRUCTIONS_VISIBILITY =
  "SET_DOCS_INSTRUCTIONS_VISIBILITY"
export const setDocsInstructionsVisibility = createAction(
  SET_DOCS_INSTRUCTIONS_VISIBILITY
)

export const SET_COUPON_NOTIFICATION_VISIBILITY =
  "SET_COUPON_NOTIFICATION_VISIBILITY"
export const setCouponNotificationVisibility = createAction(
  SET_COUPON_NOTIFICATION_VISIBILITY
)

export const SET_NAV_DRAWER_OPEN = "SET_NAV_DRAWER_OPEN"
export const setNavDrawerOpen = createAction(SET_NAV_DRAWER_OPEN)

export const SHOW_ENROLL_PAY_LATER_SUCCESS = "SHOW_ENROLL_PAY_LATER_SUCCESS"
export const showEnrollPayLaterSuccess = createAction(
  SHOW_ENROLL_PAY_LATER_SUCCESS
)

export const SET_SHOW_EXPANDED_COURSE_STATUS = "SET_SHOW_EXPANDED_COURSE_STATUS"
export const setShowExpandedCourseStatus = createAction(
  SET_SHOW_EXPANDED_COURSE_STATUS
)

export const SET_PROGRAMS_TO_UNENROLL = "SET_PROGRAMS_TO_UNENROLL"
export const setProgramsToUnEnroll = createAction(SET_PROGRAMS_TO_UNENROLL)

export const SET_UNENROLL_API_INFLIGHT_STATE = "SET_UNENROLL_API_INFLIGHT_STATE"
export const setUnEnrollApiInFlightState = createAction(
  SET_UNENROLL_API_INFLIGHT_STATE
)
