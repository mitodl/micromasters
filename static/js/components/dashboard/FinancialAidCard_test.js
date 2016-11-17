// @flow
import _ from 'lodash';
import React from 'react';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

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
  FA_STATUS_SKIPPED,
} from '../../constants';
import { INITIAL_UI_STATE } from '../../reducers/ui';

describe("FinancialAidCard", () => {
  let sandbox;
  let openFinancialAidCalculatorStub, setSkipDialogStub, setDocsInstructionsVisibility;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    openFinancialAidCalculatorStub = sandbox.stub();
    setSkipDialogStub = sandbox.stub();
    setDocsInstructionsVisibility = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderCard = (props = {}) => {
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <FinancialAidCard
          program={DASHBOARD_RESPONSE[1]}
          coursePrice={COURSE_PRICES_RESPONSE[0]}
          updateDocumentSentDate={sandbox.stub()}
          documents={{
            documentSentDate: '2011-11-11'
          }}
          fetchDashboard={sandbox.stub()}
          openFinancialAidCalculator={openFinancialAidCalculatorStub}
          setDocumentSentDate={sandbox.stub()}
          ui={INITIAL_UI_STATE}
          setConfirmSkipDialogVisibility={setSkipDialogStub}
          skipFinancialAid={sandbox.stub()}
          setDocsInstructionsVisibility={sandbox.stub()}
          {...props}
        />
      </MuiThemeProvider>
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
      const program = programWithStatus();
      program.financial_aid_user_info.has_user_applied = false;
      let wrapper = renderCard({ program });
      let button = wrapper.find(".dashboard-button");
      assert.equal(button.text(), "Calculate your cost");
      button.simulate('click');
      assert.ok(openFinancialAidCalculatorStub.calledWith());
    });

    it('shows the minimum and maximum price', () => {
      const program = programWithStatus();
      program.financial_aid_user_info.has_user_applied = false;

      let wrapper = renderCard({ program });
      let min = program.financial_aid_user_info.min_possible_cost;
      let max = program.financial_aid_user_info.max_possible_cost;
      assert.deepEqual([`$${min}`, `$${max}`], wrapper.find(".price").map(node => node.text()));
    });

    it('shows a link to open the calculator', () => {
      const program = programWithStatus();
      program.financial_aid_user_info.has_user_applied = false;
      let wrapper = renderCard({ program });
      assert.equal(wrapper.find('.full-price').text(), 'Skip this and Pay Full Price');
    });

    it('opens the skip dialog when you click "Skip this..."', () => {
      const program = programWithStatus();
      program.financial_aid_user_info.has_user_applied = false;
      let wrapper = renderCard({ program });
      wrapper.find('.full-price').simulate('click');
      assert.ok(setSkipDialogStub.calledWith(true), 'Dialog should get opened');
    });
  });

  describe('applied', () => {
    for (let status of [FA_STATUS_APPROVED, FA_STATUS_AUTO_APPROVED, FA_STATUS_SKIPPED]) {
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

      it(`has a link to skip financial aid for ${status}`, () => {
        let program = programWithStatus(status);
        let setConfirmSkipDialogVisibility = sandbox.stub();
        let wrapper = renderCard({ program, setConfirmSkipDialogVisibility });
        wrapper.find(".full-price").simulate('click');
        assert(setConfirmSkipDialogVisibility.calledWith(true));
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

      it(`provides a link to open a dialog with complete instruction for status ${FA_STATUS_PENDING_DOCS}`, () => {
        let program = programWithStatus(FA_STATUS_PENDING_DOCS);
        let wrapper = renderCard({ program, setDocsInstructionsVisibility });
        let link = wrapper.find('.financial-aid-box').find('a');
        link.simulate('click');
        assert.ok(setDocsInstructionsVisibility.called, 'should have called onClick handler');
      });

      it('sends the document date', () => {
        let program = programWithStatus(FA_STATUS_PENDING_DOCS);

        let updateDocumentSentDate = sandbox.stub();
        updateDocumentSentDate.returns(Promise.resolve());
        let wrapper = renderCard({ program, updateDocumentSentDate });

        wrapper.find(".dashboard-button").simulate('click');
        assert(updateDocumentSentDate.calledWith(123, '2011-11-11'));
      });

      for (let status of [FA_STATUS_DOCS_SENT, FA_STATUS_PENDING_MANUAL_APPROVAL]) {
        it(`shows the document sent date for status ${status}`, () => {
          let program = programWithStatus(status);
          let wrapper = renderCard({ program });
          assert(wrapper.text().includes('Documents mailed on 3/3/2003'));
        });
      }
    });
  });

  it('hides the skip dialog if the cancel button is clicked', () => {
    let program = programWithStatus();
    let setConfirmSkipDialogVisibility = sandbox.stub();
    let wrapper = renderCard({ program, setConfirmSkipDialogVisibility });
    wrapper.find("SkipFinancialAidDialog").props().cancel();
    assert(setConfirmSkipDialogVisibility.calledWith(false));
  });
});
