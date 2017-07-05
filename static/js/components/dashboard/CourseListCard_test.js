// @flow
import Decimal from 'decimal.js-light';
import React from 'react';
import PropTypes from 'prop-types';
import { mount } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { calculatePrices } from '../../lib/coupon';
import CourseListCard from './CourseListCard';
import CourseRow from './CourseRow';
import { DASHBOARD_RESPONSE, COURSE_PRICES_RESPONSE } from '../../test_constants';
import { INITIAL_EMAIL_STATE } from '../../reducers/email';
import { INITIAL_UI_STATE } from '../../reducers/ui';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import IntegrationTestHelper from '../../util/integration_test_helper';
import { Provider } from 'react-redux';
import {
  receiveGetProgramEnrollmentsSuccess,
  setCurrentProgramEnrollment,
} from '../../actions/programs';
import {
  FA_STATUS_CREATED,
  FA_STATUS_APPROVED,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
} from '../../constants';
import { makeCoupon } from '../../factories/dashboard';
import type { CoursePrice } from '../../flow/dashboardTypes';

describe('CourseListCard', () => {
  let program, coursePrice: CoursePrice, sandbox, helper, routerPushStub;
  beforeEach(() => {
    program = _.cloneDeep(DASHBOARD_RESPONSE.programs[1]);
    coursePrice = _.cloneDeep((COURSE_PRICES_RESPONSE.find(
      coursePrice => coursePrice.program_id === program.id
    ): any));

    assert.isAbove(program.courses.length, 0);
    sandbox = sinon.sandbox.create();
    routerPushStub = sandbox.stub();
    helper = new IntegrationTestHelper();
  });

  afterEach(() => {
    sandbox.restore();
    helper.cleanup();
  });

  const changeToFinancialAid = (status = FA_STATUS_APPROVED, hasUserApplied = true) => {
    program.financial_aid_availability = true;
    program.financial_aid_user_info = {
      application_status: status,
      date_documents_sent: "foo",
      has_user_applied: hasUserApplied,
      max_possible_cost: 100,
      min_possible_cost: 100,
      id: 1,
    };
    coursePrice.financial_aid_availability = true;
  };

  let renderCourseListCard = (props = {}) => {
    helper.store.dispatch(receiveGetProgramEnrollmentsSuccess(DASHBOARD_RESPONSE.programs));
    helper.store.dispatch(setCurrentProgramEnrollment(program));

    let coupons = props.coupon ? [props.coupon] : [];
    let prices = calculatePrices([program], [coursePrice], coupons);
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Provider store={helper.store}>
          <CourseListCard
            program={program}
            coursePrice={coursePrice}
            addCourseEnrollment={() => Promise.resolve()}
            prices={prices}
            ui={INITIAL_UI_STATE}
            openCourseContactDialog={() => undefined}
            closeEmailDialog={() => undefined}
            updateEmailEdit={() => undefined}
            sendEmail={() => undefined}
            emailDialogVisibility={false}
            email={INITIAL_EMAIL_STATE}
            setEnrollCourseDialogVisibility={() => undefined}
            setEnrollSelectedCourseRun={() => undefined}
            checkout={() => undefined}
            setShowExpandedCourseStatus={() => undefined}
            setShowGradeDetailDialog={() => undefined}
            {...props}
          />
        </Provider>
      </MuiThemeProvider>,
      {
        context: { router: { push: routerPushStub}},
        childContextTypes: {
          router:   PropTypes.object.isRequired
        }
      },
    );
  };

  describe('pricing message', () => {
    it('is displayed', () => {
      const wrapper = renderCourseListCard();
      const messageEl = wrapper.find(".price-message");
      assert.lengthOf(messageEl, 1);
      assert.include(
        messageEl.text(),
        "Courses in this program cost $4000 USD each."
      );
    });

    describe('with financial aid', () => {
      it('requires applying for financial aid', () => {
        changeToFinancialAid(FA_STATUS_CREATED, false);
        const wrapper = renderCourseListCard();
        const messageEl = wrapper.find(".price-message");
        assert.lengthOf(messageEl, 1);
        assert.include(
          messageEl.text(),
          "You need to get your Personal Course Price before you can pay for courses."
        );
      });

      it('displays price after financial aid', () => {
        changeToFinancialAid(FA_STATUS_APPROVED, true);
        const wrapper = renderCourseListCard();
        const messageEl = wrapper.find(".price-message");
        assert.lengthOf(messageEl, 1);
        assert.include(
          messageEl.text(),
          "Your Personal Course Price is $4000 USD per course."
        );
      });

      it('displays price with fixed discount coupon', () => {
        changeToFinancialAid(FA_STATUS_APPROVED, true);
        const coupon = makeCoupon(program);
        const wrapper = renderCourseListCard({coupon});
        const messageEl = wrapper.find(".price-message");
        assert.lengthOf(messageEl, 1);
        assert.include(
          messageEl.text(),
          "Your price is $3950 USD per course, including both financial aid and your coupon."
        );
      });

      it('displays price with percentage discount coupon', () => {
        changeToFinancialAid(FA_STATUS_APPROVED, true);
        const coupon = makeCoupon(program);
        coupon.amount_type = COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT;
        coupon.amount = new Decimal('0.30');
        const wrapper = renderCourseListCard({coupon});
        const messageEl = wrapper.find(".price-message");
        assert.lengthOf(messageEl, 1);
        assert.include(
          messageEl.text(),
          "Your price is $2800 USD per course, including both financial aid and your coupon."
        );
      });

      it('displays price with both coupon and financial aid', () => {
        changeToFinancialAid(FA_STATUS_APPROVED, true);
        const coupon = makeCoupon(program);
        const wrapper = renderCourseListCard({coupon});
        const messageEl = wrapper.find(".price-message");
        assert.lengthOf(messageEl, 1);
        assert.include(
          messageEl.text(),
          "Your price is $3950 USD per course, including both financial aid and your coupon."
        );
      });

      it('handles 100% coupon (special case)', () => {
        changeToFinancialAid(FA_STATUS_APPROVED, true);
        const coupon = makeCoupon(program);
        coupon.amount_type = COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT;
        coupon.amount = new Decimal('1');
        const wrapper = renderCourseListCard({coupon});
        const messageEl = wrapper.find(".price-message");
        assert.lengthOf(messageEl, 1);
        assert.include(
          messageEl.text(),
          "Courses in this program are free, because of your coupon."
        );
      });
    });
  });

  it('creates a CourseRow for each course', () => {
    const now = moment();
    const courseRunId = program.courses[0].runs[0].id;
    const price = new Decimal('123.45');
    const prices = new Map([[courseRunId, price]]);
    const wrapper = renderCourseListCard({
      now: now,
      prices: prices,
    });
    assert.equal(wrapper.find(CourseRow).length, program.courses.length);
    let courses = _.sortBy(program.courses, 'position_in_program');
    wrapper.find(CourseRow).forEach((courseRow, i) => {
      const props = courseRow.props();
      assert.equal(props.now, now);
      assert.equal(props.prices, prices);
      assert.deepEqual(props.course, courses[i]);
    });
  });

  it("fills in now if it's missing in the props", () => {
    const wrapper = renderCourseListCard();
    let nows = wrapper.find(CourseRow).map(courseRow => courseRow.props().now);
    assert.isAbove(nows.length, 0);
    for (let now of nows) {
      // Each now must be exactly the same object
      assert.equal(now, nows[0]);
    }
  });

  it("doesn't show the personalized pricing box for programs without it", () => {
    program.financial_aid_availability = false;
    const wrapper = renderCourseListCard();
    assert.equal(wrapper.find('.personalized-pricing').length, 0);
  });
});
