// @flow
import React from 'react';
import { Card } from 'react-mdl/lib/Card';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import SpinnerButton from './SpinnerButton';
import { FETCH_PROCESSING } from '../actions';
import type { Course, CourseRun } from '../flow/programTypes';
import type { CoursePrice } from '../flow/dashboardTypes';
import { formatPrice } from '../util/util';

class OrderSummary extends React.Component {
  props: {
    course:           Course,
    courseRun:        CourseRun,
    coursePrice:      CoursePrice,
    finalPrice:       ?number,
    discount:         ?number,
    couponCode:       ?string,
    checkout:         Function,
    checkoutStatus?:  string,
  };
  getCoursePrice(): string {
    const { coursePrice } = this.props;
    return formatPrice(coursePrice.price);
  }
  getFinalPrice(): string {
    const { finalPrice } = this.props;
    return formatPrice(finalPrice);
  }
  getDiscountAmount(): string {
    const { discount } = this.props;
    return `-${formatPrice(discount)}`;
  }
  getExplanationText(): React$Element<*> {
    const { finalPrice, coursePrice } = this.props;
    let text;
    let price = (finalPrice !== undefined && finalPrice !== null) ? finalPrice : coursePrice.price;
    if (price > 0) {
      text = "Clicking continue will take you to an external website, where you " +
        "can complete the transaction with a credit or debit card.";
    }else{
      text = "Because there is no cost to enroll in this course, when you click the button below" +
        " you will skip the normal payment process and be enrolled in the course immediately.";
    }
    return <p className="payment-explanation">{text}</p>;
  }

  showAmount(description: string, amount: string): Array<React$Element<*>> {
    return [
      <Cell col={8} tablet={4} phone={2} className="description" key={description}>
        {description}
      </Cell>,
      <Cell
        col={2}
        key={`${description}-amount`}
        className="align-right">
        <b className="amount">{amount}</b>
      </Cell>
    ];
  }

  render() {
    let { course, courseRun, checkout, checkoutStatus, couponCode} = this.props;
    let discountInfo;
    if (couponCode) {
      discountInfo = [
        this.showAmount(`Discount from coupon ${couponCode}`, this.getDiscountAmount()),
        <Cell col={10} tablet={6} phone={4} className="division-line" key="division"/>,
        this.showAmount('Total', this.getFinalPrice())
      ];
    }
    return (
      <div>
        <Card shadow={1}>
          <p className="intro-text">You are about to pay for <b>{ course.title }</b></p>
          <div className="wrapper-box">
            <Grid className="summary-box">
              {this.showAmount('Cost of course', this.getCoursePrice())}
              {discountInfo}
            </Grid>
          </div>
          {this.getExplanationText()}
        </Card>
        <p className="terms-of-service-text">
          By clicking below, you agree to the <a href="/terms_of_service" target="_blank">
          MITx MicroMasters Terms of Service.
          </a>
        </p>
        <SpinnerButton
          className="mdl-button next continue-payment"
          component={Button}
          spinning={checkoutStatus === FETCH_PROCESSING}
          onClick={()=>(checkout(courseRun.course_id))}
      >
        Continue
      </SpinnerButton>
      </div>
    );
  }
}



export default OrderSummary;
