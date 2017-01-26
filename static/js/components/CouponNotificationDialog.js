// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

import {
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
} from '../constants';
import type { Coupon } from '../flow/couponTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import type { Course } from '../flow/programTypes';

type CouponNotification = {
  coupon:               Coupon,
  couponProgram:        ?AvailableProgram,
  couponCourse:         ?Course,
  open:                 boolean,
  setDialogVisibility:  (v: boolean) => void,
};

const CouponNotificationDialog = (
  { coupon, couponProgram, couponCourse, open, setDialogVisibility }: CouponNotification
) => {
  const {
    amount,
    amount_type: amountType,
    content_type: contentType,
    program_id: programId,
    object_id: objectId,
  } = coupon;
  let programName;
  if ( couponProgram ) {
    programName = `the ${couponProgram.title} MicroMasters program`;
  } else {
    programName = `program ID ${programId}`;
  }

  let title, message;
  if ( contentType === COUPON_CONTENT_TYPE_PROGRAM ) {
    if ( amountType === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT ) {
      title = `Coupon applied: ${amount.times(100).toDecimalPlaces(0).toString()}% off each course!`;
      message = <p>
        This coupon gives <strong>a discount
        of { amount.times(100).toDecimalPlaces(0).toString() }% off</strong> the price
        of <strong>each</strong> course in { programName }.
      </p>;
    } else if ( amountType === COUPON_AMOUNT_TYPE_FIXED_DISCOUNT ) {
      title = `Coupon applied: $${amount} off each course!`;
      message = <p>
        This coupon gives <strong>a discount
        of ${ amount.toString() } off</strong> the price
        of <strong>each</strong> course in { programName }.
      </p>;
    }
  } else if (contentType === COUPON_CONTENT_TYPE_COURSE) {
    let courseName;
    if ( couponCourse ) {
      courseName = `${couponCourse.title} in ${programName}`;
    } else {
      courseName = `course ID ${objectId} in ${programName}`;
    }
    if ( amountType === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT ) {
      title = `Coupon applied: ${amount.times(100)}% off!`;
      message = <p>
        This coupon gives <strong>a discount
        of { amount.times(100).toString() }% off</strong> the price
        of { courseName }.
      </p>;
    } else if ( amountType === COUPON_AMOUNT_TYPE_FIXED_DISCOUNT ) {
      title = `Coupon applied: $${amount} off!`;
      message = <p>
        This coupon gives <strong>a discount
        of ${ amount.toString() } off</strong> the price
        of { courseName }.
      </p>;
    }
  }

  const okButton = <Button
    type='ok'
    key='ok'
    className="primary-button ok-button"
    onClick={() => setDialogVisibility(false)}>
    OK
  </Button>;

  return <Dialog
    title={title}
    titleClassName="dialog-title"
    contentClassName="dialog coupon-notification-dialog"
    className="coupon-notification-dialog-wrapper"
    actions={okButton}
    open={open}
    onRequestClose={() => setDialogVisibility(false)}
  >
    {message}
    <p>The discount will be automatically applied when you enroll.</p>
  </Dialog>;
};

export default CouponNotificationDialog;
