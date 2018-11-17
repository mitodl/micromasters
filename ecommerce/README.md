# Ecommcere

## Orders and Lines

TBD

## Coupons

We use coupons to offer discounts on courses and program (but not specific course runs) 
and for learners to redeem bulk purchases. 

Coupon discounts can be percentage-based, or a fixed dollar amount. In all cases, coupons
reduce the cost of the order. 

The `content_type` can be for a program, or for a course (the drop-down in the admin allows
the type to be any object in the MicroMasters application, but only program and course
make sense). The `object_id` refers to the id of the specific program or course. 

Almost all `coupon_type` are set to standard. The `discounted-previous-course` is used 
only for coupons that are automatically applied for learners who paid for a verified 
certificate on edX before the MicroMasters programs began. 

The `amount_type` determines whether the coupon is a percentage off, a fixed dollar amount 
off, or if the price is fixed. 

Depending on the `amount_type` the `amount` can refer to a percentage (between 0 and 1.0),
or a dollar amount. 

The foreign key to `CouponInvoice` is for bookkeeping. 

## How to create and redeem coupons

### How to create coupons

See [this gist](https://gist.github.com/pdpinch/16ce7ec62a2a3d01e49003847a73aa25)

This gist can be run in the django shell. It should be written as a management command. 

### How to redeem a coupon

1. Login to MicroMasters
2. go to /dashboard?coupon=<coupon_code>

If the coupon was successfully applied, the user will see a toast message. If not, they 
will get an error. 

### How to revert a coupon

1. Delete the corresponding `UserCoupon` object
2. Delete the corresponding `RedeemedCoupon` object 

