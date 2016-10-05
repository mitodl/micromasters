// @flow
import _ from 'lodash';
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';

import FinancialAidCard from './FinancialAidCard';
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  ISO_8601_FORMAT,

  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_PENDING_MANUAL_APPROVAL,
  FA_STATUS_APPROVED,
  FA_STATUS_REJECTED,
  FA_STATUS_SKIPPED,
} from '../../constants';

describe("FinancialAidCard", () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  let renderCard = (props = {}) => {
    return shallow(
      <FinancialAidCard
        program={DASHBOARD_RESPONSE[1]}
        coursePrice={COURSE_PRICES_RESPONSE[0]}
        updateDocumentSentDate={sandbox.stub()}
        documents={{
          documentSentDate: '2011-11-11'
        }}
        fetchDashboard={sandbox.stub()}
        openFinancialAidCalculator={sandbox.stub()}
        setDocumentSentDate={sandbox.stub()}
        {...props}
      />
    );
  };

  let programWithStatus = (status = null) => {
    const program = _.cloneDeep(DASHBOARD_RESPONSE[1]);
    program.financial_aid_availability = true;
    program.financial_aid_user_info = {
      application_status: status,
      has_user_applied: true,
      min_possible_cost: 23,
      max_possible_cost: 45,
      id: 123,
      date_documents_sent: '2003-03-03'
    };
    return program;
  };

  describe('not yet applied', () => {
    it("shows the personalized pricing box when user has not yet applied", () => {
      const program = programWithStatus();

      let wrapper = renderCard({program});
      assert.equal(wrapper.find('.personalized-pricing').length, 0);
      program.financial_aid_user_info.has_user_applied = false;

      wrapper = renderCard({ program });
      assert.equal(wrapper.find('.personalized-pricing').length, 1);
    });

    it('calculates the cost when you click the button', () => {
      let openFinancialAidCalculator = sandbox.stub();
      const program = programWithStatus();
      program.financial_aid_user_info.has_user_applied = false;
      let wrapper = renderCard({ program, openFinancialAidCalculator });
      let button = wrapper.find(".dashboard-button");
      assert.equal(button.text(), "Calculate your cost");
      button.simulate('click');
      assert.ok(openFinancialAidCalculator.calledWith());
    });

    it('shows the minimum and maximum price', () => {
      const program = programWithStatus();
      program.financial_aid_user_info.has_user_applied = false;

      let wrapper = renderCard({ program });
      let min = program.financial_aid_user_info.min_possible_cost;
      let max = program.financial_aid_user_info.max_possible_cost;
      assert.deepEqual([`$${min}`, `$${max}`], wrapper.find(".price").map(node => node.text()));
    });
  });

  describe('applied', () => {
    for (let status of [FA_STATUS_APPROVED, FA_STATUS_AUTO_APPROVED, FA_STATUS_SKIPPED, FA_STATUS_REJECTED]) {
      it(`shows the cost if the status is ${status}`, () => {
        let program = programWithStatus(status);
        let wrapper = renderCard({ program });
        let expectedPrice = `$${COURSE_PRICES_RESPONSE[0].price}`;
        assert.equal(wrapper.find(".price").map(node => node.text()), expectedPrice);
      });
    }

    for (let status of [FA_STATUS_PENDING_DOCS, FA_STATUS_DOCS_SENT, FA_STATUS_PENDING_MANUAL_APPROVAL]) {
      it(`shows a mailing address if the status is ${status}`, () => {
        let program = programWithStatus(status);
        let wrapper = renderCard({ program });
        assert.ok(wrapper.html().includes("Cambridge, MA 02139"));
      });
    }

    describe('documents', () => {
      it(`provides a datepicker which updates state for status ${FA_STATUS_PENDING_DOCS}`, () => {
        let program = programWithStatus(FA_STATUS_PENDING_DOCS);

        let setDocumentSentDate = sandbox.stub();
        let wrapper = renderCard({ program, setDocumentSentDate });
        let props = wrapper.find("DatePicker").props();

        assert.equal(props.selected.format(ISO_8601_FORMAT), '2011-11-11');
        props.onChange(moment("1999-01-01"));
        assert.ok(setDocumentSentDate.calledWith("1999-01-01"));
      });

      it('sends the document date', done => {
        let program = programWithStatus(FA_STATUS_PENDING_DOCS);

        let updateDocumentSentDate = sandbox.stub();
        let fetchDashboard = () => {
          // should be the last thing executed
          done();
        };
        updateDocumentSentDate.returns(Promise.resolve());
        let wrapper = renderCard({ program, updateDocumentSentDate, fetchDashboard });

        wrapper.find(".dashboard-button").simulate('click');
        assert(updateDocumentSentDate.calledWith(123, '2011-11-11'));

        // the test is also waiting for fetchDashboard to execute
      });

      for (let status of [FA_STATUS_DOCS_SENT, FA_STATUS_PENDING_MANUAL_APPROVAL]) {
        it(`shows the document sent date for status ${status}`, () => {
          let program = programWithStatus(status);
          let wrapper = renderCard({ program });
          assert(wrapper.html().includes('Documents mailed on 3/3/2003'));
        });
      }
    });
  });
});