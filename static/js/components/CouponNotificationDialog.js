// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"
import Button from "@material-ui/core/Button"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import DialogActions from "@material-ui/core/DialogActions"

import {
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE
} from "../constants"
import { makeAmountMessage } from "../lib/coupon"
import type { Coupon } from "../flow/couponTypes"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import type { Course } from "../flow/programTypes"

type CouponNotification = {
  coupon: Coupon,
  couponProgram: ?AvailableProgram,
  couponCourse: ?Course,
  open: boolean,
  setDialogVisibility: (v: boolean) => void
}

const CouponNotificationDialog = ({
  coupon,
  couponProgram,
  couponCourse,
  open,
  setDialogVisibility
  }: CouponNotification) => {
  const {
    amount_type: amountType,
    content_type: contentType,
    program_id: programId,
    object_id: objectId
  } = coupon
  let programName
  if (couponProgram) {
    programName = `the ${couponProgram.title} MicroMasters program`
  } else {
    programName = `program ID ${programId}`
  }
  let courseName
  if (couponCourse) {
    courseName = `${couponCourse.title}`
  } else {
    courseName = `course ID ${objectId}`
  }

  const isDiscount =
    amountType === COUPON_AMOUNT_TYPE_FIXED_DISCOUNT ||
    amountType === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT

  let title, message
  if (isDiscount) {
    if (contentType === COUPON_CONTENT_TYPE_PROGRAM) {
      title = `Coupon applied: ${makeAmountMessage(coupon)} off each course!`
      message = (
        <p>
          This coupon gives{" "}
          <strong>a discount of {makeAmountMessage(coupon)}</strong> off the
          price of <strong>each</strong> course in {programName}.
        </p>
      )
    } else if (contentType === COUPON_CONTENT_TYPE_COURSE) {
      title = `Coupon applied: ${makeAmountMessage(coupon)} off!`
      message = (
        <p>
          This coupon gives{" "}
          <strong>a discount of {makeAmountMessage(coupon)}</strong> off the
          price of {courseName}.
        </p>
      )
    }
  } else {
    title = `Coupon applied: course price set to ${makeAmountMessage(coupon)}`
    if (contentType === COUPON_CONTENT_TYPE_PROGRAM) {
      message = (
        <p>
          This coupon sets the price of each course in {programName} at the
          fixed price of <strong>{makeAmountMessage(coupon)}</strong>.
        </p>
      )
    } else if (contentType === COUPON_CONTENT_TYPE_COURSE) {
      message = (
        <p>
          This coupon sets the price of {courseName} at the fixed price of{" "}
          <strong>{makeAmountMessage(coupon)}</strong>.
        </p>
      )
    }
  }

  let discountAppliedMessage
  if (contentType === COUPON_CONTENT_TYPE_PROGRAM) {
    discountAppliedMessage = (
      <p>Your course prices have been adjusted accordingly.</p>
    )
  } else if (contentType === COUPON_CONTENT_TYPE_COURSE) {
    discountAppliedMessage = (
      <p>Your course price has been adjusted accordingly.</p>
    )
  }

  const okButton = (
    <Button
      key="ok"
      className="primary-button ok-button"
      onClick={() => setDialogVisibility(false)}
    >
      OK
    </Button>
  )

  return (
    <Dialog
      classes={{
        paper: "dialog coupon-notification-dialog",
        root:  "coupon-notification-dialog-wrapper"
      }}
      open={open}
      onClose={() => setDialogVisibility(false)}
    >
      <DialogTitle className="dialog-title">{title}</DialogTitle>
      <DialogContent>
        {message}
        {discountAppliedMessage}
      </DialogContent>
      <DialogActions>{okButton}</DialogActions>
    </Dialog>
  )
}

export default CouponNotificationDialog
