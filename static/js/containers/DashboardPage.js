// @flow
/* global SETTINGS: false */
import DocumentTitle from "react-document-title"
import React from "react"
import Card from "@material-ui/core/Card"
import PropTypes from "prop-types"
import type { Dispatch } from "redux"
import { connect } from "react-redux"
import _ from "lodash"
import moment from "moment"
import R from "ramda"
import Dialog from "@material-ui/core/Dialog"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import DialogActions from "@material-ui/core/DialogActions"
import Alert from "react-bootstrap/lib/Alert"

import ProgramEnrollmentDialog from "../components/ProgramEnrollmentDialog"
import Loader from "../components/Loader"
import { calculatePrices, isFreeCoupon } from "../lib/coupon"
import {
  FETCH_SUCCESS,
  FETCH_PROCESSING,
  FETCH_FAILURE,
  checkout
} from "../actions"
import {
  updateCourseStatus,
  fetchDashboard,
  clearDashboard
} from "../actions/dashboard"
import { clearProfile } from "../actions/profile"
import { addProgramEnrollment } from "../actions/programs"
import {
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_PROGRAM,
  FA_TERMINAL_STATUSES,
  FA_PENDING_STATUSES,
  TOAST_SUCCESS,
  TOAST_FAILURE,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_PENDING_ENROLLMENT,
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_PAID_BUT_NOT_ENROLLED
} from "../constants"
import {
  setToastMessage,
  setConfirmSkipDialogVisibility,
  setDocsInstructionsVisibility,
  setCouponNotificationVisibility,
  setPaymentTeaserDialogVisibility,
  setEnrollCourseDialogVisibility,
  setCalculatePriceDialogVisibility,
  setEnrollSelectedCourseRun,
  showDialog,
  hideDialog,
  setShowExpandedCourseStatus,
  setEnrollProgramDialogError,
  setEnrollProgramDialogVisibility,
  setEnrollSelectedProgram
} from "../actions/ui"
import { showEnrollPayLaterSuccessMessage } from "../actions/course_enrollments"
import { clearCalculatorEdit } from "../actions/financial_aid"
import { findCourseRun } from "../util/util"
import CourseListCard from "../components/dashboard/CourseListCard"
import DashboardUserCard from "../components/dashboard/DashboardUserCard"
import FinancialAidCard from "../components/dashboard/FinancialAidCard"
import FinalExamCard from "../components/dashboard/FinalExamCard"
import ErrorMessage from "../components/ErrorMessage"
import LearnersInProgramCard from "../components/LearnersInProgramCard"
import ProgressWidget from "../components/ProgressWidget"
import DiscussionCard from "../components/DiscussionCard"
import { clearCoupons, fetchCoupons } from "../actions/coupons"
import {
  setDocumentSentDate,
  updateDocumentSentDate
} from "../actions/documents"
import {
  startCalculatorEdit,
  updateCalculatorEdit
} from "../actions/financial_aid"
import { setTimeoutActive } from "../actions/order_receipt"
import { attachCoupon, setRecentlyAttachedCoupon } from "../actions/coupons"
import { COURSE_EMAIL_TYPE } from "../components/email/constants"
import { COURSE_TEAM_EMAIL_CONFIG } from "../components/email/lib"
import { withEmailDialog } from "../components/email/hoc"
import { singleBtnDialogActions } from "../components/inputs/util"
import { skipFinancialAid } from "../actions/financial_aid"
import { currencyForCountry } from "../lib/currency"
import DocsInstructionsDialog from "../components/DocsInstructionsDialog"
import CouponNotificationDialog from "../components/CouponNotificationDialog"
import CourseEnrollmentDialog from "../components/CourseEnrollmentDialog"
import {
  getPearsonSSODigest,
  pearsonSSOInProgress,
  pearsonSSOFailure,
  setPearsonError
} from "../actions/pearson"
import { INCOME_DIALOG } from "./FinancialAidCalculator"
import { processCheckout } from "./OrderSummaryPage"
import { generateSSOForm } from "../lib/pearson"
import { getOwnDashboard, getOwnCoursePrices } from "../reducers/util"
import { actions } from "../lib/redux_rest"
import { wait } from "../util/util"
import { CALCULATOR_DIALOG } from "./FinancialAidCalculator"
import { gradeDetailPopupKey } from "../components/dashboard/courses/Grades"

import type { UIState } from "../reducers/ui"
import type { OrderReceiptState } from "../reducers/order_receipt"
import type { DocumentsState } from "../reducers/documents"
import type {
  CoursePrices,
  DashboardState,
  ProgramLearners
} from "../flow/dashboardTypes"
import type { AllEmailsState } from "../flow/emailTypes"
import type {
  AvailableProgram,
  AvailableProgramsState
} from "../flow/enrollmentTypes"
import type { FinancialAidState } from "../reducers/financial_aid"
import type { CouponsState } from "../reducers/coupons"
import type { ProfileGetResult } from "../flow/profileTypes"
import type { Course, CourseRun, Program } from "../flow/programTypes"
import type { Coupon } from "../flow/couponTypes"
import type { PearsonAPIState } from "../reducers/pearson"
import type { RestState } from "../flow/restTypes"
import type { Post } from "../flow/discussionTypes"
import PersonalCoursePriceDialog from "../components/dashboard/PersonalCoursePriceDialog"

const isFinishedProcessing = R.contains(R.__, [FETCH_SUCCESS, FETCH_FAILURE])
const PEARSON_TOS_DIALOG = "pearsonTOSDialogVisible"

export type GradeType = "EDX_GRADE" | "EXAM_GRADE"
export const EDX_GRADE: GradeType = "EDX_GRADE"
export const EXAM_GRADE: GradeType = "EXAM_GRADE"

class DashboardPage extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  props: {
    coupons: CouponsState,
    profile: ProfileGetResult,
    currentProgramEnrollment: AvailableProgram,
    programs: AvailableProgramsState,
    dashboard: DashboardState,
    prices: RestState<CoursePrices>,
    programLearners: RestState<ProgramLearners>,
    dispatch: Dispatch,
    ui: UIState,
    email: AllEmailsState,
    documents: DocumentsState,
    orderReceipt: OrderReceiptState,
    financialAid: FinancialAidState,
    location: Object,
    pearson: PearsonAPIState,
    openEmailComposer: (emailType: string, emailOpenParams: any) => void,
    discussionsFrontpage: RestState<Array<Post>>
  }

  componentDidMount() {
    this.updateRequirements()
  }

  componentDidUpdate() {
    this.updateRequirements()

    const program = this.getCurrentlyEnrolledProgram()
    if (this.shouldSkipFinancialAid() && program !== undefined) {
      this.skipFinancialAid(program.id)
    }
  }

  componentWillUnmount() {
    const { dispatch, programLearners } = this.props
    dispatch(clearDashboard(SETTINGS.user.username))
    dispatch(actions.prices.clear(SETTINGS.user.username))

    _.forEach(R.keys(programLearners), id =>
      dispatch(actions.programLearners.clear(id))
    )
    dispatch(clearCoupons())
  }

  submitPearsonSSO = () => {
    const {
      dispatch,
      profile: { profile }
    } = this.props

    dispatch(getPearsonSSODigest())
      .then(res => {
        dispatch(pearsonSSOInProgress())
        const { session_timeout, sso_digest, timestamp, sso_redirect_url } = res

        const form = generateSSOForm(
          profile.student_id,
          timestamp,
          session_timeout,
          sso_digest,
          sso_redirect_url
        )
        form.submit()
      })
      .catch(() => {
        dispatch(pearsonSSOFailure())
        dispatch(
          setPearsonError(
            "It looks like we're experiencing an issue with scheduling, try again later."
          )
        )
      })
  }

  openCourseContactDialog = (course: Course, canContactCourseTeam: boolean) => {
    const { dispatch, openEmailComposer } = this.props
    if (canContactCourseTeam) {
      openEmailComposer(COURSE_EMAIL_TYPE, course)
    } else {
      dispatch(setPaymentTeaserDialogVisibility(true))
    }
  }

  closePaymentTeaserDialog = () => {
    const { dispatch } = this.props
    dispatch(setPaymentTeaserDialogVisibility(false))
  }

  handleOrderSuccess = (course: Course): void => {
    const {
      dispatch,
      ui: { toastMessage }
    } = this.props
    const firstRun: ?CourseRun = course.runs.length > 0 ? course.runs[0] : null

    if (_.isNil(toastMessage)) {
      if (firstRun && firstRun.status === STATUS_PAID_BUT_NOT_ENROLLED) {
        dispatch(
          setToastMessage({
            title:   "Course Enrollment",
            message: `Something went wrong. You paid for this course '${
              course.title
            }' but are not enrolled.`,
            icon: TOAST_FAILURE
          })
        )
      } else {
        dispatch(
          setToastMessage({
            title:   "Order Complete!",
            message: `You are now enrolled in ${course.title}`,
            icon:    TOAST_SUCCESS
          })
        )
      }
    }
    this.context.router.push("/dashboard/")
  }

  handleOrderCancellation = (): void => {
    const {
      dispatch,
      ui: { toastMessage }
    } = this.props
    if (_.isNil(toastMessage)) {
      dispatch(
        setToastMessage({
          message: "Order was cancelled",
          icon:    TOAST_FAILURE
        })
      )
    }
    this.context.router.push("/dashboard/")
  }

  handleOrderPending = (run: CourseRun): void => {
    const { dispatch } = this.props
    dispatch(
      updateCourseStatus(
        SETTINGS.user.username,
        run.course_id,
        STATUS_PENDING_ENROLLMENT
      )
    )

    if (!this.props.orderReceipt.timeoutActive) {
      wait(3000).then(() => {
        const { orderReceipt } = this.props
        dispatch(setTimeoutActive(false))
        const deadline = moment(orderReceipt.initialTime).add(2, "minutes")
        const now = moment()
        if (now.isBefore(deadline)) {
          dispatch(fetchDashboard(SETTINGS.user.username, true))
        } else {
          dispatch(
            setToastMessage({
              message: "Order was not processed",
              icon:    TOAST_FAILURE
            })
          )
        }
      })
      dispatch(setTimeoutActive(true))
    }
  }

  updateRequirements = () => {
    this.fetchDashboard()
    this.fetchCoursePrices()
    this.fetchProgramLearners()
    this.handleCoupon()
    this.fetchCoupons()
    this.handleOrderStatus()
    this.fetchDiscussionsFrontpage()
    this.checkFinancialAidError()
  }

  checkFinancialAidError = () => {
    const {
      financialAid: { fetchError },
      dispatch
    } = this.props
    if (fetchError && fetchError.message === "Profile is not complete") {
      dispatch(clearProfile(SETTINGS.user.username))
      this.context.router.push(`/profile/`)
      dispatch(hideDialog(INCOME_DIALOG))
      dispatch(clearCalculatorEdit())
    }
  }

  fetchDashboard() {
    const { dashboard, dispatch } = this.props
    if (dashboard.fetchStatus === undefined) {
      dispatch(fetchDashboard(SETTINGS.user.username))
    }
  }

  fetchCoursePrices() {
    const { prices, dispatch } = this.props
    if (prices.getStatus === undefined) {
      dispatch(actions.prices.get(SETTINGS.user.username))
    }
  }

  fetchProgramLearners() {
    const { programLearners, dispatch } = this.props
    const program = this.getCurrentlyEnrolledProgram()
    if (
      program !== undefined &&
      R.pathEq([program.id, "getStatus"], undefined, programLearners)
    ) {
      dispatch(actions.programLearners.get(program.id))
    }
  }

  fetchCoupons() {
    const { coupons, dispatch } = this.props
    if (coupons.fetchGetStatus === undefined) {
      dispatch(fetchCoupons())
    }
  }

  handleOrderStatus = () => {
    const {
      dashboard,
      location: { query }
    } = this.props

    if (dashboard.fetchStatus !== FETCH_SUCCESS) {
      // wait until we have access to the dashboard
      return
    }

    const courseKey = query.course_key
    if (query.status === "receipt") {
      const [courseRun, course] = findCourseRun(
        dashboard.programs,
        run => run !== null && run.course_id === courseKey
      )
      if (courseRun === null || course === null) {
        // could not find course to handle order status for
        return
      }
      switch (courseRun.status) {
      case STATUS_CAN_UPGRADE:
      case STATUS_OFFERED:
        // user is directed to the order receipt page but order is not yet fulfilled
        this.handleOrderPending(courseRun)
        break
      case STATUS_NOT_PASSED:
      case STATUS_PASSED:
      case STATUS_CURRENTLY_ENROLLED:
      case STATUS_PAID_BUT_NOT_ENROLLED:
        this.handleOrderSuccess(course)
        break
      default:
          // do nothing, a timeout was set to check back later
        break
      }
    } else if (query.status === "cancel") {
      this.handleOrderCancellation()
    }
  }

  fetchDiscussionsFrontpage() {
    const { dispatch, discussionsFrontpage } = this.props
    if (
      SETTINGS.FEATURES.DISCUSSIONS_POST_UI &&
      SETTINGS.open_discussions_redirect_url &&
      !discussionsFrontpage.loaded &&
      !discussionsFrontpage.processing
    ) {
      dispatch(actions.discussionsFrontpage.get())
    }
  }

  handleCoupon = () => {
    const {
      coupons,
      dispatch,
      location: { query }
    } = this.props

    if (!query.coupon) {
      // If there's no coupon code in the URL query parameters,
      // there's nothing to do.
      return
    }

    if (coupons.fetchPostStatus !== undefined) {
      // If we've already launched a POST request to attach this coupon
      // to this user, don't launch another one.
      return
    }

    if (
      coupons.fetchGetStatus === FETCH_PROCESSING ||
      coupons.fetchGetStatus === undefined
    ) {
      /*
      Abort to avoid the following race condition:

        1. launch first fetchCoupons() API request
        2. launch attachCoupon() API request
        3. attachCoupon() returns, launch second fetchCoupons() API request
        4. second fetchCoupons() returns, updates Redux store with accurate information
        5. first fetchCoupons() finally returns, updates Redux store with stale information

      Ideally, it would be nice to abort the first fetchCoupons() API request
      in this case, but fetches can't be aborted. Instead, we will abort
      this function (by returning early), and rely on being called again in the
      future.
      */
      return
    }

    dispatch(attachCoupon(query.coupon)).then(
      result => {
        this.setRecentlyAttachedCoupon(result.coupon)
        this.setCouponNotificationVisibility(true)
        this.context.router.push("/dashboard/")
        // update coupon state in Redux
        dispatch(fetchCoupons())
      },
      () => {
        dispatch(
          setToastMessage({
            title:   "Coupon failed",
            message: "This coupon code is invalid or does not exist.",
            icon:    TOAST_FAILURE
          })
        )
        this.context.router.push("/dashboard/")
      }
    )
  }

  openFinancialAidCalculator = () => {
    const {
      dispatch,
      currentProgramEnrollment,
      profile: {
        profile: { country }
      }
    } = this.props
    dispatch(startCalculatorEdit(currentProgramEnrollment.id))
    if (country) {
      const currencyPrediction = currencyForCountry(country)
      dispatch(updateCalculatorEdit({ currency: currencyPrediction }))
    }
    dispatch(showDialog(CALCULATOR_DIALOG))
  }

  setDocumentSentDate = (newDate: string): void => {
    const { dispatch } = this.props
    dispatch(setDocumentSentDate(newDate))
  }

  getCurrentlyEnrolledProgram = () => {
    const { currentProgramEnrollment, dashboard } = this.props
    if (_.isNil(currentProgramEnrollment) || _.isNil(dashboard)) {
      return undefined
    }
    return dashboard.programs.find(
      program => program.id === currentProgramEnrollment.id
    )
  }

  skipFinancialAid = (programId: number): any => {
    const { dispatch, financialAid } = this.props

    const program = this.getCurrentlyEnrolledProgram()
    if (
      program &&
      program.financial_aid_user_info &&
      !FA_TERMINAL_STATUSES.includes(
        program.financial_aid_user_info.application_status
      ) &&
      financialAid.fetchSkipStatus === undefined
    ) {
      return dispatch(skipFinancialAid(programId)).then(
        () => {
          this.setConfirmSkipDialogVisibility(false)
        },
        () => {
          this.setConfirmSkipDialogVisibility(false)
          dispatch(
            setToastMessage({
              message: "Failed to skip financial aid.",
              icon:    TOAST_FAILURE
            })
          )
        }
      )
    }
  }

  setConfirmSkipDialogVisibility = bool => {
    const { dispatch } = this.props
    dispatch(setConfirmSkipDialogVisibility(bool))
  }

  updateDocumentSentDate = (
    financialAidId: number,
    sentDate: string
  ): Promise<*> => {
    const { dispatch } = this.props
    return dispatch(updateDocumentSentDate(financialAidId, sentDate))
  }

  addCourseEnrollment = (courseId: string): Promise<*> => {
    const { dispatch } = this.props
    return dispatch(actions.courseEnrollments.post(courseId)).then(
      () => {
        dispatch(fetchDashboard(SETTINGS.user.username, true))
        dispatch(actions.prices.get(SETTINGS.user.username, true))
        dispatch(showEnrollPayLaterSuccessMessage(courseId))
      },
      () => {
        dispatch(
          setToastMessage({
            message: "Failed to add course enrollment.",
            icon:    TOAST_FAILURE
          })
        )
      }
    )
  }

  setDocsInstructionsVisibility = bool => {
    const { dispatch } = this.props
    dispatch(setDocsInstructionsVisibility(bool))
  }

  setCouponNotificationVisibility = bool => {
    const { dispatch } = this.props
    dispatch(setCouponNotificationVisibility(bool))
  }

  setRecentlyAttachedCoupon = (coupon: Coupon) => {
    const { dispatch } = this.props
    dispatch(setRecentlyAttachedCoupon(coupon))
  }

  setEnrollCourseDialogVisibility = bool => {
    const { dispatch } = this.props
    dispatch(setEnrollCourseDialogVisibility(bool))
  }

  setEnrollSelectedCourseRun = (run: CourseRun) => {
    const { dispatch } = this.props
    dispatch(setEnrollSelectedCourseRun(run))
  }

  setCalculatePriceDialogVisibility = bool => {
    const { dispatch } = this.props
    dispatch(setCalculatePriceDialogVisibility(bool))
  }

  navigateToProfile = () => {
    this.context.router.push("/learner")
  }

  shouldSkipFinancialAid = (): boolean => {
    // If the user has a 100% off coupon for the program, there's no need for financial aid
    const program = this.getCurrentlyEnrolledProgram()

    return R.compose(
      R.any(
        coupon =>
          program !== undefined &&
          isFreeCoupon(coupon) &&
          coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM &&
          coupon.program_id === program.id
      ),
      R.pathOr([], ["coupons", "coupons"])
    )(this.props)
  }

  showPearsonTOSDialog = (open: boolean) => {
    const { dispatch } = this.props
    if (open) {
      dispatch(showDialog(PEARSON_TOS_DIALOG))
    } else {
      dispatch(hideDialog(PEARSON_TOS_DIALOG))
    }
  }

  setShowGradeDetailDialog = (
    open: boolean,
    gradeType: GradeType,
    courseTitle: string
  ) => {
    const { dispatch } = this.props
    if (open) {
      dispatch(showDialog(gradeDetailPopupKey(gradeType, courseTitle)))
    } else {
      dispatch(hideDialog(gradeDetailPopupKey(gradeType, courseTitle)))
    }
  }

  setShowExpandedCourseStatus = (courseId: number) => {
    const { dispatch } = this.props
    dispatch(setShowExpandedCourseStatus(courseId))
  }

  renderCouponDialog() {
    const { programs, ui, coupons, dashboard } = this.props
    const coupon = coupons.recentlyAttachedCoupon
    if (!coupon) {
      return null
    }
    const couponProgram = programs.availablePrograms.find(
      program => program.id === coupon.program_id
    )
    let couponCourse = null
    if (coupon.content_type === COUPON_CONTENT_TYPE_COURSE) {
      const dashboardCouponProgram: Program = (dashboard.programs.find(
        program => program.id === coupon.program_id
      ): any)
      couponCourse = dashboardCouponProgram.courses.find(
        course => course.id === coupon.object_id
      )
    }
    return (
      <CouponNotificationDialog
        coupon={coupon}
        couponProgram={couponProgram}
        couponCourse={couponCourse}
        open={ui.couponNotificationVisibility}
        setDialogVisibility={this.setCouponNotificationVisibility}
      />
    )
  }

  renderCourseContactPaymentDialog() {
    const { ui } = this.props
    const program = this.getCurrentlyEnrolledProgram()
    const messageTail =
      program && program.financial_aid_availability
        ? "learners who have paid for the course"
        : "verified learners"
    return (
      <Dialog
        classes={{ paper: "dialog", root: "course-payment-dialog-wrapper" }}
        open={ui.paymentTeaserDialogVisibility}
        onClose={this.closePaymentTeaserDialog}
      >
        <DialogTitle className="dialog-title">
          Contact the Course Team
        </DialogTitle>
        <DialogContent>
          <div className="inner-content">
            <img
              src="/static/images/contact_course_team_icon.png"
              alt="Instructor icon"
            />
            <p>{`This is a premium feature for ${messageTail}.`}</p>
          </div>
        </DialogContent>
        <DialogActions>
          {singleBtnDialogActions(this.closePaymentTeaserDialog)}
        </DialogActions>
      </Dialog>
    )
  }

  dispatchCheckout = (courseId: string) => {
    const { dispatch } = this.props
    return dispatch(checkout(courseId)).then(processCheckout)
  }

  renderPersonalCoursePriceDialog() {
    const { ui } = this.props
    return (
      <PersonalCoursePriceDialog
        open={ui.calculatePriceDialogVisibility}
        openFinancialAidCalculator={this.openFinancialAidCalculator}
        setVisibility={this.setCalculatePriceDialogVisibility}
      />
    )
  }

  renderCourseEnrollmentDialog() {
    const { ui } = this.props
    const program = this.getCurrentlyEnrolledProgram()
    if (!program) {
      return null
    }
    const courseRun = ui.enrollSelectedCourseRun
    if (!courseRun) {
      return null
    }
    const course = program.courses.find(course =>
      R.contains(courseRun.id, R.pluck("id", course.runs))
    )
    if (!course) {
      return null
    }

    // technically this is, has user applied or does it not matter if they didn't
    const hasUserApplied =
      !program.financial_aid_availability ||
      this.shouldSkipFinancialAid() ||
      program.financial_aid_user_info.has_user_applied
    const pendingFinancialAid =
      program.financial_aid_availability &&
      program.financial_aid_user_info.has_user_applied &&
      FA_PENDING_STATUSES.includes(
        program.financial_aid_user_info.application_status
      )

    return (
      <CourseEnrollmentDialog
        course={course}
        courseRun={courseRun}
        hasUserApplied={hasUserApplied}
        pendingFinancialAid={pendingFinancialAid}
        financialAidAvailability={program.financial_aid_availability}
        openFinancialAidCalculator={this.openFinancialAidCalculator}
        checkout={this.dispatchCheckout}
        open={ui.enrollCourseDialogVisibility}
        setVisibility={this.setEnrollCourseDialogVisibility}
        addCourseEnrollment={this.addCourseEnrollment}
      />
    )
  }

  renderEdxCacheRefreshErrorMessage() {
    const { dashboard } = this.props
    if (dashboard.isEdxDataFresh) {
      return null
    }
    const email = SETTINGS.support_email

    return (
      <div className="alert-message alert-message-inline">
        <Alert bsStyle="danger">
          <p>
            Sorry, edx.org is not responding as expected, so some of the
            information on this page may not be up to date. <br />
            Please refresh the browser, or check back later.
          </p>
          <p>
            If the error persists, contact{" "}
            <a href={`mailto:${email}`}>{email}</a> for help.
          </p>
        </Alert>
      </div>
    )
  }

  renderErrorMessage = (): React$Element<*> | null => {
    const { dashboard, prices } = this.props
    if (dashboard.errorInfo) {
      return <ErrorMessage errorInfo={dashboard.errorInfo} />
    }
    if (prices.error) {
      return <ErrorMessage errorInfo={prices.error} />
    }
    return null
  }

  renderLearnersInProgramCard(programID: number) {
    const { programLearners } = this.props
    let learnersInProgramCard
    if (
      R.pathSatisfies(
        count => count > 0,
        [programID, "data", "learners_count"],
        programLearners
      )
    ) {
      learnersInProgramCard = (
        <LearnersInProgramCard
          programLearners={programLearners[programID].data}
        />
      )
    }
    return learnersInProgramCard
  }

  addProgramEnrollmentInProgram = (programId: number): Promise<*> => {
    const { dispatch } = this.props
    return dispatch(addProgramEnrollment(programId))
  }

  setEnrollDialogError = (error: ?string): void => {
    const { dispatch } = this.props
    dispatch(setEnrollProgramDialogError(error))
  }

  setEnrollDialogVisibility = (visibility: boolean): void => {
    const { dispatch } = this.props
    dispatch(setEnrollProgramDialogVisibility(visibility))
  }

  setEnrollSelectedProgramById = (programId: ?number): void => {
    const { dispatch } = this.props
    if (programId) {
      dispatch(setEnrollSelectedProgram(programId))
    }
  }

  noProgramSelectedCard = () => {
    const {
      programs,
      ui: {
        enrollProgramDialogError,
        enrollProgramDialogVisibility,
        enrollSelectedProgram
      }
    } = this.props

    return (
      <div>
        <Card shadow={1} className="no-program-card">
          <div>You are not currently enrolled in any programs</div>
          <button
            className="mm-minor-action enroll-wizard-button"
            onClick={() => this.setEnrollDialogVisibility(true)}
          >
            Enroll in a MicroMasters Program
          </button>
          <ProgramEnrollmentDialog
            enrollInProgram={this.addProgramEnrollmentInProgram}
            programs={programs.availablePrograms}
            selectedProgram={enrollSelectedProgram}
            error={enrollProgramDialogError}
            visibility={enrollProgramDialogVisibility}
            setError={this.setEnrollDialogError}
            setVisibility={this.setEnrollDialogVisibility}
            setSelectedProgram={this.setEnrollSelectedProgramById}
            fetchAddStatus={programs.postStatus}
          />
        </Card>
      </div>
    )
  }

  renderPageContent = (): React$Element<*> => {
    const {
      dashboard,
      prices,
      profile: { profile },
      documents,
      ui,
      financialAid,
      coupons,
      pearson,
      discussionsFrontpage
    } = this.props
    const program = this.getCurrentlyEnrolledProgram()

    if (!program) {
      return this.noProgramSelectedCard()
    }

    if (!prices.data) {
      throw new Error("no program; should never get here")
    }

    const couponPrices = calculatePrices(
      dashboard.programs,
      prices.data,
      coupons.coupons
    )
    let financialAidCard
    if (program.financial_aid_availability && !this.shouldSkipFinancialAid()) {
      financialAidCard = (
        <FinancialAidCard
          program={program}
          couponPrices={couponPrices}
          openFinancialAidCalculator={this.openFinancialAidCalculator}
          documents={documents}
          setDocumentSentDate={this.setDocumentSentDate}
          skipFinancialAid={this.skipFinancialAid}
          updateDocumentSentDate={this.updateDocumentSentDate}
          setConfirmSkipDialogVisibility={this.setConfirmSkipDialogVisibility}
          setDocsInstructionsVisibility={this.setDocsInstructionsVisibility}
          ui={ui}
          financialAid={financialAid}
        />
      )
    }

    return (
      <div>
        {this.renderEdxCacheRefreshErrorMessage()}
        <h5 className="program-title-dashboard">{program.title}</h5>
        <div className="double-column">
          <DocsInstructionsDialog
            open={ui.docsInstructionsVisibility}
            setDialogVisibility={this.setDocsInstructionsVisibility}
          />
          {this.renderCouponDialog()}
          {this.renderCourseEnrollmentDialog()}
          {this.renderPersonalCoursePriceDialog()}
          <div className="first-column">
            <DashboardUserCard profile={profile} program={program} />
            <FinalExamCard
              profile={profile}
              program={program}
              pearson={pearson}
              ui={ui}
              navigateToProfile={this.navigateToProfile}
              submitPearsonSSO={this.submitPearsonSSO}
              showPearsonTOSDialog={this.showPearsonTOSDialog}
            />
            {financialAidCard}
            <CourseListCard
              program={program}
              couponPrices={couponPrices}
              key={program.id}
              ui={ui}
              checkout={this.dispatchCheckout}
              openFinancialAidCalculator={this.openFinancialAidCalculator}
              addCourseEnrollment={this.addCourseEnrollment}
              openCourseContactDialog={this.openCourseContactDialog}
              setEnrollSelectedCourseRun={this.setEnrollSelectedCourseRun}
              setEnrollCourseDialogVisibility={
                this.setEnrollCourseDialogVisibility
              }
              setCalculatePriceDialogVisibility={
                this.setCalculatePriceDialogVisibility
              }
              setShowExpandedCourseStatus={this.setShowExpandedCourseStatus}
              setShowGradeDetailDialog={this.setShowGradeDetailDialog}
              showStaffView={false}
            />
          </div>
          <div className="second-column">
            <ProgressWidget program={program} />
            {SETTINGS.FEATURES.DISCUSSIONS_POST_UI &&
            SETTINGS.open_discussions_redirect_url ? (
                <DiscussionCard
                  program={program}
                  frontpage={discussionsFrontpage.data || []}
                  loaded={discussionsFrontpage.loaded}
                />
              ) : null}
            {this.renderLearnersInProgramCard(program.id)}
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { dashboard, prices } = this.props
    const loaded = R.all(isFinishedProcessing, [
      dashboard.fetchStatus,
      prices.getStatus
    ])
    const fetchStarted =
      !_.isNil(prices.getStatus) && !_.isNil(dashboard.fetchStatus)
    // TODO: we should handle prices.noSpinner too. This currently works because we always dispatch both actions with
    // noSpinner: true at the same time
    const noSpinner = dashboard.noSpinner

    const errorMessage = this.renderErrorMessage()
    let pageContent
    if ((_.isNil(errorMessage) && loaded && fetchStarted) || noSpinner) {
      pageContent = this.renderPageContent()
    }

    return (
      <DocumentTitle title="Learner Dashboard | MITx MicroMasters">
        <div className="dashboard">
          <Loader loaded={loaded}>
            {errorMessage}
            {pageContent}
            {this.renderCourseContactPaymentDialog()}
          </Loader>
        </div>
      </DocumentTitle>
    )
  }
}

const mapStateToProps = state => {
  let profile = {
    profile: {}
  }
  if (SETTINGS.user && state.profiles[SETTINGS.user.username] !== undefined) {
    profile = state.profiles[SETTINGS.user.username]
  }
  return {
    profile:                  profile,
    dashboard:                getOwnDashboard(state),
    prices:                   getOwnCoursePrices(state),
    programLearners:          state.programLearners,
    programs:                 state.programs,
    currentProgramEnrollment: state.currentProgramEnrollment,
    ui:                       state.ui,
    email:                    state.email,
    documents:                state.documents,
    orderReceipt:             state.orderReceipt,
    financialAid:             state.financialAid,
    coupons:                  state.coupons,
    pearson:                  state.pearson,
    discussionsFrontpage:     state.discussionsFrontpage
  }
}

export default R.compose(
  connect(mapStateToProps),
  withEmailDialog({
    [COURSE_EMAIL_TYPE]: COURSE_TEAM_EMAIL_CONFIG
  })
)(DashboardPage)
