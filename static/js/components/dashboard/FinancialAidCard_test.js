import _ from 'lodash';
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import FinancialAidCard from './FinancialAidCard';
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  FA_STATUS_AUTO_APPROVED,
} from '../../constants';

describe("FinancialAidCard", () => {

  it("shows the personalized pricing box when user has not yet applied", () => {
    const program = _.cloneDeep(DASHBOARD_RESPONSE[1]);
    program.financial_aid_availability = true;
    program.financial_aid_user_info = {
      application_status: FA_STATUS_AUTO_APPROVED,
      has_user_applied: true,
      min_possible_cost: 23,
      max_possible_cost: 45,
    };

    let wrapper = shallow(
      <FinancialAidCard program={program} coursePrice={COURSE_PRICES_RESPONSE[0]} />
    );
    assert.equal(wrapper.find('.personalized-pricing').length, 0);
    program.financial_aid_user_info.has_user_applied = false;
    wrapper = shallow(
      <FinancialAidCard program={program} coursePrice={COURSE_PRICES_RESPONSE[0]} />
    );
    assert.equal(wrapper.find('.personalized-pricing').length, 1);
  });

});