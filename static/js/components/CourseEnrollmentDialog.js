// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import IconButton from 'react-mdl/lib/IconButton';
import Button from 'react-mdl/lib/Button';
import Decimal from 'decimal.js-light';
import type { Course, CourseRun } from '../flow/programTypes';

const dialogTitle = (course, setDialogVisibility) => (
  <div className="title">
    <div className="text" key={1}>
      Enroll in {course.title}
    </div>
    <IconButton name="close" className="close"
      onClick={() => setDialogVisibility(false)} key={2}
    />
  </div>
);

export default class CourseEnrollmentDialog extends React.Component {
  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  props: {
    open:                     boolean,
    setVisibility:            (v: boolean) => void,
    course:                   Course,
    courseRun:                CourseRun,
    price:                    ?Decimal,
    addCourseEnrollment:      (courseId: string) => Promise<*>,
    checkout:                 Function,
    financialAidAvailability: boolean,
  };

  handlePayClick = () => {
    const {
      courseRun,
      setVisibility,
      checkout,
      financialAidAvailability
    } = this.props;
    if (financialAidAvailability) {
      setVisibility(false);
      const url = `/order_summary/?course_key=${encodeURIComponent(courseRun.course_id)}`;
      this.context.router.push(url);
    } else{
      return checkout(courseRun.course_id);
    }
  }

  handleAuditClick = () => {
    const {
      courseRun,
      addCourseEnrollment,
      setVisibility,
    } = this.props;
    setVisibility(false);
    addCourseEnrollment(courseRun.course_id);
  };

  render() {
    const { open, setVisibility, course, price } = this.props;
    let message, payButton, auditButton;
    if (price) {
      message = `You can pay now, or you can audit the course for FREE
        and upgrade later. (Payment is required to get credit for the
        MicroMasters certificate.)`;
      payButton = (
        <Button key="pay" onClick={this.handlePayClick}
          colored className="dashboard-button pay-button">
          Pay Now
        </Button>
      );
    } else {
      message = `You need to get a Personalized Course Price before
        you can pay for this course. Or you can audit the course for FREE
        and upgrade later. (Payment is required to get credit for the
        MicroMasters certificate.)`;
      payButton = (
        <Button key="pay" disabled
          colored className="dashboard-button pay-button">
          Pay Now
        </Button>
      );
    }
    auditButton = (
      <Button key="audit" onClick={this.handleAuditClick}
        colored className="dashboard-button audit-button">
        Audit for Free & Pay Later
      </Button>
    );

    return <Dialog
      title={dialogTitle(course, setVisibility)}
      titleClassName="dialog-title"
      contentClassName="dialog course-enrollment-dialog"
      className="course-enrollment-dialog-wrapper"
      open={open}
      onRequestClose={() => setVisibility(false)}
      actions={[payButton, auditButton]}
      contentStyle={{maxWidth: '600px'}}
      actionsContainerStyle={{paddingBottom: '20px', textAlign: 'center'}}
    >
      <p>{message}</p>
    </Dialog>;
  }
}
