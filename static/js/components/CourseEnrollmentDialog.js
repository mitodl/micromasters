// @flow
import React from "react"
import PropTypes from "prop-types"
import Dialog from "material-ui/Dialog"
import IconButton from "react-mdl/lib/IconButton"
import Button from "react-mdl/lib/Button"
import type { Course, CourseRun } from "../flow/programTypes"

const dialogTitle = (course, setDialogVisibility) => (
  <div className="title">
    <div className="text" key={1}>
      Enroll in {course.title}
    </div>
    <IconButton
      name="close"
      className="close"
      onClick={() => setDialogVisibility(false)}
      key={2}
    />
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
        <Button
          key="pay"
          disabled
          colored
          className="dashboard-button pay-button"
        >
          Pay Now
        </Button>
      )
    } else if (hasUserApplied) {
      message = (
        <p>
          You can pay now, or you can audit the course for FREE and upgrade
          later. (Payment is required to get credit for the MicroMasters
          certificate.)
        </p>
      )
      payButton = (
        <Button
          key="pay"
          onClick={this.handlePayClick}
          colored
          className="dashboard-button pay-button"
        >
          Pay Now
        </Button>
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
        <Button
          key="pay"
          disabled
          colored
          className="dashboard-button pay-button"
        >
          Pay Now
        </Button>
      )
    }
    const auditButton = (
      <Button
        key="audit"
        onClick={this.handleAuditClick}
        colored
        className="dashboard-button audit-button"
      >
        Audit for Free & Pay Later
      </Button>
    )

    return (
      <Dialog
        title={dialogTitle(course, setVisibility)}
        titleClassName="dialog-title"
        contentClassName="dialog course-enrollment-dialog"
        className="course-enrollment-dialog-wrapper"
        open={open}
        onRequestClose={() => setVisibility(false)}
        actions={[payButton, auditButton]}
        contentStyle={{ maxWidth: "600px" }}
        actionsContainerStyle={{ paddingBottom: "20px", textAlign: "center" }}
      >
        {message}
      </Dialog>
    )
  }
}
