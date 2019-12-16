// @flow
import React from "react"
import PropTypes from "prop-types"
import Dialog from "@material-ui/core/Dialog"
import IconButton from "@material-ui/core/IconButton"
import Icon from "@material-ui/core/Icon"
import type { Course, CourseRun } from "../flow/programTypes"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import DialogActions from "@material-ui/core/DialogActions"

const dialogTitle = (course, setDialogVisibility) => (
  <div className="title">
    <div className="text" key={1}>
      Enroll in {course.title}
    </div>
    <IconButton className="close" onClick={() => setDialogVisibility(false)}>
      <Icon>close</Icon>
    </IconButton>
  </div>
)

export default class CourseEnrollmentDialog extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  props: {
    open: boolean,
    setVisibility: (v: boolean) => void,
    course: Course,
    courseRun: CourseRun,
    hasUserApplied: boolean,
    pendingFinancialAid: boolean,
    addCourseEnrollment: (courseId: string) => Promise<*>,
    checkout: Function,
    financialAidAvailability: boolean,
    openFinancialAidCalculator: () => void
  }

  handlePayClick = () => {
    const {
      courseRun,
      setVisibility,
      checkout,
      financialAidAvailability
    } = this.props
    if (financialAidAvailability) {
      setVisibility(false)
      const url = `/order_summary/?course_key=${encodeURIComponent(
        courseRun.course_id
      )}`
      this.context.router.push(url)
    } else {
      return checkout(courseRun.course_id)
    }
  }

  handleAuditClick = () => {
    const { courseRun, addCourseEnrollment, setVisibility } = this.props
    setVisibility(false)
    addCourseEnrollment(courseRun.course_id)
  }

  handleCalculatePriceClick = (e: Event) => {
    const { openFinancialAidCalculator, setVisibility } = this.props
    setVisibility(false)
    openFinancialAidCalculator()
    e.preventDefault()
  }

  render() {
    const {
      open,
      setVisibility,
      course,
      courseRun,
      hasUserApplied,
      pendingFinancialAid
    } = this.props
    let message, payButton
    if (pendingFinancialAid) {
      message = [
        <p key="1">
          Your personal course price is pending, and needs to approved before
          you can pay for courses. Or you can audit for free and pay later.
        </p>,
        <p key="2">
          You will need to pay in order to get credit for MicroMasters
          certificate.
        </p>
      ]
      payButton = (
        <button
          key="pay"
          disabled
          className="mdl-button dashboard-button pay-button"
        >
          Pay Now
        </button>
      )
    } else if (courseRun.has_paid) {
      message = (
        <p>
          Would you like to enroll in this course? You already paid for this
          course.
        </p>
      )
      payButton = (
        <button
          key="pay"
          disabled
          className="mdl-button dashboard-button pay-button"
        >
          Pay Now
        </button>
      )
    } else if (hasUserApplied) {
      message = [
        <p key="1">
          You can pay now, or you can audit the course for FREE and upgrade
          later. (Payment is required to get credit for the MicroMasters
          certificate.)
        </p>,
        <p key="2">
          <span className="bold">Coupon Holders</span> - If you have a coupon,
          click Pay Now. The coupon will be applied during checkout.
        </p>
      ]
      payButton = (
        <button
          key="pay"
          onClick={this.handlePayClick}
          className="mdl-button dashboard-button pay-button"
        >
          Pay Now
        </button>
      )
    } else {
      message = [
        <p key="1">
          You need to{" "}
          <a
            href="#"
            className="calculate-link"
            onClick={this.handleCalculatePriceClick}
          >
            calculate you course price
          </a>{" "}
          before you can pay for this course. Or you can audit courses for free
          and pay later.
        </p>,
        <p key="2">
          You will need to pay in order to get credit for MicroMasters
          certificate.
        </p>
      ]
      payButton = (
        <button
          key="pay"
          disabled
          className="mdl-button dashboard-button pay-button"
        >
          Pay Now
        </button>
      )
    }
    const auditButton = (
      <button
        key="audit"
        onClick={this.handleAuditClick}
        className="mdl-button dashboard-button audit-button"
      >
        {courseRun.has_paid ? "Enroll" : "Audit for Free & Pay Later"}
      </button>
    )

    return (
      <Dialog
        classes={{ paper: "dialog course-enrollment-dialog" }}
        className="course-enrollment-dialog-wrapper"
        open={open}
        onClose={() => setVisibility(false)}
      >
        <DialogTitle className="dialog-title">
          {dialogTitle(course, setVisibility)}
        </DialogTitle>
        <DialogContent>{message}</DialogContent>
        <DialogActions>{[payButton, auditButton]}</DialogActions>
      </Dialog>
    )
  }
}
