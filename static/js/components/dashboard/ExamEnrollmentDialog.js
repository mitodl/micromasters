// @flow
import React from "react"
import PropTypes from "prop-types"
import Dialog from "@material-ui/core/Dialog"
import Button from "@material-ui/core/Button"

import { singleBtnDialogActions } from "../inputs/util"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import DialogContent from "@material-ui/core/DialogContent"
import type { Course } from "../../flow/programTypes"
import { addExamEnrollment } from "../../lib/api"

export default class ExamEnrollmentDialog extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  props: {
    open: boolean,
    course: ?Course,
    setVisibility: (v: boolean) => void,
    addExamEnrollment: (examCourseId: string) => Promise<*>
  }

  render() {
    const { setVisibility, open, course } = this.props
    if (!course) {
      return null
    }

    const examRegisterButton = (
      <Button
        key="register-button"
        onClick={() => {
          course.exam_course_key
            ? addExamEnrollment(course.exam_course_key)
            : setVisibility(false)
        }}
        className="primary-button"
      >
        Register Now
      </Button>
    )
    return (
      <Dialog
        classes={{
          paper: "dialog exam-enrollment-dialog",
          root:  "exam-enrollment-dialog-wrapper"
        }}
        open={open}
        onClose={() => setVisibility(false)}
      >
        <DialogTitle className="dialog-title">Are you sure?</DialogTitle>
        <DialogContent>
          Are you sure you want to register for the {course.title} exam? You
          should only click REGISTER NOW if you are certain you are going to
          take the exam this semester. Registering but not taking the exam will
          count as a 0 on the proctored exam and will use up one proctored exam
          attempt.
        </DialogContent>
        <DialogActions>
          {[
            singleBtnDialogActions(() => setVisibility(false), "cancel"),
            examRegisterButton
          ]}
        </DialogActions>
      </Dialog>
    )
  }
}
