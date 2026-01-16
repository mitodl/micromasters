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

// eslint-disable-next-line require-jsdoc
export default class CourseEnrollmentDialog extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  props: {
    open: boolean,
    setVisibility: (v: boolean) => void,
    course: Course,
    courseRun: CourseRun,
    addCourseEnrollment: (courseId: string) => Promise<*>
  }

  handlePayClick = () => {
    // Payments are no longer accepted (discontinued in 2021)
    // This is now a no-op
  }

  handleAuditClick = () => {
    // eslint-disable-next-line no-invalid-this
    const { courseRun, addCourseEnrollment, setVisibility } = this.props
    setVisibility(false)
    addCourseEnrollment(courseRun.course_id)
  }

  // eslint-disable-next-line require-jsdoc
  render() {
    const { open, setVisibility, course, courseRun } = this.props

    const message = (
      <p>
        Payments are no longer accepted for MicroMasters courses (discontinued
        in 2021). You can audit courses for free.
      </p>
    )

    const payButton = (
      <button
        key="pay"
        disabled
        className="mdl-button dashboard-button pay-button"
      >
        Payments Discontinued
      </button>
    )

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
