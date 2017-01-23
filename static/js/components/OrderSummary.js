import React from 'react';
import { Card } from 'react-mdl/lib/Card';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import SpinnerButton from './SpinnerButton';
import type { UIState } from '../reducers/ui';
import { FETCH_PROCESSING } from '../actions';
import type { Course, CourseRun } from '../flow/programTypes';
import type { CoursePrice } from '../flow/dashboardTypes';
import { formatPrice } from '../util/util';

class SummaryPage extends React.Component {
  props: {
    ui:               UIState,
    course:           Course,
    courseRun:        CourseRun,
    coursePrice:      CoursePrice,
    checkout:         Function,
    checkoutStatus?:  string,
  };
  getCoursePrice(): string {
    const { coursePrice } = this.props;
    return formatPrice(coursePrice.price);
  }
  getExplanationText(): string {
    const { coursePrice } = this.props;
    if (coursePrice.price > 0){
      return "Clicking below with link outside of the MIT Micromasters app" +
        "to an external website, where you will be able to complete the transaction by" +
        "paying with a creadit card."
    }else{
      return "Because there is no cost to enroll in this course, when you click the button below" +
        "you will skip the normal payment process and be enrolled in the course immediately."
    }
  }

  render() {
    let { course, courseRun, checkout, checkoutStatus } = this.props;
    return (
      <div>
        <Card shadow={1} className="profile-form">
          <p className="intro-text">You are about to enroll in <b>{ course.title }</b></p>
          <Grid className="summary-box">
            <Cell col={3}>
              Cost of course
            </Cell>
            <Cell col={9}>
              <b>{this.getCoursePrice()}</b>
              </Cell>
          </Grid>
          <p className="payment-explanation">{this.getExplanationText()}</p>
        </Card>
        <p className="terms-of-service-text">
          By clicking below, you agree to the <a href="/terms_of_service" target="_blank">
          MITx MicroMasters Terms of Service.
          </a>
        </p>
        <SpinnerButton
          className="mdl-button next continue-payment"
          key="1"
          component={Button}
          spinning={checkoutStatus === FETCH_PROCESSING}
          onClick={()=>{checkout(courseRun.course_id)}}
      >
        Continue
      </SpinnerButton>
      </div>
    );
  }
}



export default SummaryPage;
