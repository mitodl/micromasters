// @flow
import React from "react"
import Card from "@material-ui/core/Card"
import CardContent from "@material-ui/core/CardContent"
import Button from "@material-ui/core/Button"
import Grid from "@material-ui/core/Grid"

import SpinnerButton from "./SpinnerButton"
import { FETCH_PROCESSING } from "../actions"
import type { Course, CourseRun } from "../flow/programTypes"
import type { CoursePrice } from "../flow/dashboardTypes"
import { formatPrice } from "../util/util"

class OrderSummary extends React.Component {
  props: {
    course: Course,
    courseRun: CourseRun,
    coursePrice: CoursePrice,
    finalPrice: ?number,
    discount: ?number,
    couponCode: ?string,
    checkout: Function,
    checkoutStatus?: string
  }

  getCoursePrice(): string {
    const { coursePrice } = this.props
    return formatPrice(coursePrice.price)
  }

  getFinalPrice(): string {
    const { finalPrice } = this.props
    return formatPrice(finalPrice)
  }

  getDiscountAmount(): string {
    const { discount } = this.props
    return `-${formatPrice(discount)}`
  }

  getExplanationText(): React$Element<*> {
    const { finalPrice, coursePrice } = this.props
    let text
    const price =
      finalPrice !== undefined && finalPrice !== null
        ? finalPrice
        : coursePrice.price
    if (price > 0) {
      text =
        "Clicking continue will take you to an external website, where you " +
        "can complete the transaction with a credit or debit card."
    } else {
      text =
        "Because there is no cost to enroll in this course, when you click the button below" +
        " you will skip the normal payment process and be enrolled in the course immediately."
    }
    return <p className="payment-explanation">{text}</p>
  }

  showAmount(description: string, amount: string): Array<React$Element<*>> {
    return [
      <Grid item xs={8} className="description" key={description}>
        {description}
      </Grid>,
      <Grid item xs={2} key={`${description}-amount`} className="align-right">
        <b className="amount">{amount}</b>
      </Grid>
    ]
  }

  render() {
    const {
      course,
      courseRun,
      checkout,
      checkoutStatus,
      couponCode,
      discount
    } = this.props
    let discountInfo

    if (discount) {
      const message = couponCode
        ? `Discount from coupon ${couponCode}`
        : "Discount from coupon"
      discountInfo = [
        this.showAmount(message, this.getDiscountAmount()),
        <Grid item xs={10} className="division-line" key="division" />,
        this.showAmount("Total", this.getFinalPrice())
      ]
    }

    return (
      <div>
        <Card shadow={1} className="card">
          <CardContent>
            <p className="intro-text">
              You are about to pay for <b>{course.title}</b>
            </p>
            <div className="wrapper-box">
              <Grid container className="summary-box">
                {this.showAmount("Cost of course", this.getCoursePrice())}
                {discountInfo}
              </Grid>
            </div>
            {this.getExplanationText()}
          </CardContent>
        </Card>
        <p className="terms-of-service-text">
          By clicking below, you agree to the{" "}
          <a href="/terms_of_service" target="_blank" rel="noopener noreferrer">
            MITx MicroMasters Terms of Service.
          </a>
        </p>
        <SpinnerButton
          className="mdl-button next continue-payment"
          component={Button}
          spinning={checkoutStatus === FETCH_PROCESSING}
          onClick={() => checkout(courseRun.course_id)}
        >
          Continue
        </SpinnerButton>
      </div>
    )
  }
}

export default OrderSummary
