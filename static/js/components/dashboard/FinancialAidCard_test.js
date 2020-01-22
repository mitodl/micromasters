// @flow
import _ from "lodash"
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import moment from "moment"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import DatePicker from "react-datepicker"

import { makeCoursePrices } from "../../factories/dashboard"
import { calculatePrices } from "../../lib/coupon"
import { FETCH_PROCESSING } from "../../actions"
import FinancialAidCard from "./FinancialAidCard"
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE
} from "../../test_constants"
import {
  ISO_8601_FORMAT,
  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_PENDING_MANUAL_APPROVAL,
  FA_STATUS_APPROVED,
  FA_STATUS_SKIPPED
} from "../../constants"
import { INITIAL_UI_STATE } from "../../reducers/ui"

describe("FinancialAidCard", () => {
  let sandbox
  let openFinancialAidCalculatorStub,
    setSkipDialogStub,
    setDocsInstructionsVisibility

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    openFinancialAidCalculatorStub = sandbox.stub()
    setSkipDialogStub = sandbox.stub()
    setDocsInstructionsVisibility = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCard = (props = {}) => {
    const program = props.program || DASHBOARD_RESPONSE.programs[1]
    const dashboard = {
      programs:          [program],
      is_edx_data_fresh: true
    }
    const couponPrices = calculatePrices(
      dashboard.programs,
      makeCoursePrices(dashboard),
      []
    )
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <FinancialAidCard
          program={program}
          coursePrice={COURSE_PRICES_RESPONSE[0]}
          updateDocumentSentDate={sandbox.stub()}
          documents={{
            documentSentDate: "2011-11-11"
          }}
          fetchDashboard={sandbox.stub()}
          openFinancialAidCalculator={openFinancialAidCalculatorStub}
          setDocumentSentDate={sandbox.stub()}
          ui={INITIAL_UI_STATE}
          setConfirmSkipDialogVisibility={setSkipDialogStub}
          skipFinancialAid={sandbox.stub()}
          setDocsInstructionsVisibility={sandbox.stub()}
          financialAid={{}}
          couponPrices={couponPrices}
          {...props}
        />
      </MuiThemeProvider>
    )
  }

  const programWithStatus = (status = null) => {
    const program = _.cloneDeep(DASHBOARD_RESPONSE.programs[1])
    program.financial_aid_availability = true
    program.financial_aid_user_info = {
      application_status:  status,
      has_user_applied:    true,
      min_possible_cost:   23,
      max_possible_cost:   45,
      id:                  123,
      date_documents_sent: "2003-03-03"
    }
    return program
  }

  describe("not yet applied", () => {
    it("shows the personalized pricing box when user has not yet applied", () => {
      const program = programWithStatus()

      let wrapper = renderCard({ program })
      assert.lengthOf(wrapper.find(".personalized-pricing"), 0)
      program.financial_aid_user_info.has_user_applied = false

      wrapper = renderCard({ program })
      assert.lengthOf(wrapper.find(".personalized-pricing"), 1)
    })

    it("calculates the cost when you click the button", () => {
      const program = programWithStatus()
      program.financial_aid_user_info.has_user_applied = false
      const wrapper = renderCard({ program })
      const button = wrapper.find(".calculate-cost-button")
      assert.equal(button.text(), "Get My Price Now")
      button.simulate("click")
      sinon.assert.calledWith(openFinancialAidCalculatorStub)
    })

    it("shows the minimum and maximum price", () => {
      const program = programWithStatus()
      program.financial_aid_user_info.has_user_applied = false

      const wrapper = renderCard({ program })
      const min = program.financial_aid_user_info.min_possible_cost
      const max = program.financial_aid_user_info.max_possible_cost
      assert.deepEqual(
        [`$${min}`, `$${max}`],
        wrapper
          .find(".explanation")
          .find(".bold")
          .map(node => node.text())
      )
    })

    it("shows a link to open the calculator", () => {
      const program = programWithStatus()
      program.financial_aid_user_info.has_user_applied = false
      const wrapper = renderCard({ program })
      assert.equal(
        wrapper.find(".full-price").text(),
        "Skip this and Pay Full Price"
      )
    })

    it('opens the skip dialog when you click "Skip this..."', () => {
      const program = programWithStatus()
      program.financial_aid_user_info.has_user_applied = false
      const wrapper = renderCard({ program })
      wrapper.find(".full-price").simulate("click")
      assert.ok(setSkipDialogStub.calledWith(true), "Dialog should get opened")
    })
  })

  describe("applied", () => {
    for (const status of [
      FA_STATUS_APPROVED,
      FA_STATUS_AUTO_APPROVED,
      FA_STATUS_SKIPPED
    ]) {
      it(`don't show card if status is ${status}`, () => {
        const program = programWithStatus(status)
        const wrapper = renderCard({ program })
        assert.equal(wrapper.html(), "")
      })

      it(`don't show no-calls message if status is ${status}`, () => {
        const program = programWithStatus(status)
        const wrapper = renderCard({ program })
        assert.lengthOf(wrapper.find(".no-calls-message"), 0)
      })
    }

    for (const status of [
      FA_STATUS_PENDING_DOCS,
      FA_STATUS_DOCS_SENT,
      FA_STATUS_PENDING_MANUAL_APPROVAL
    ]) {
      it(`shows a mailing address if the status is ${status}`, () => {
        const program = programWithStatus(status)
        const wrapper = renderCard({ program })
        assert.include(wrapper.html(), "Cambridge, MA 02139")
      })

      it(`shows no-calls message if status is ${status}`, () => {
        const program = programWithStatus(status)
        const wrapper = renderCard({ program })
        assert.lengthOf(wrapper.find(".no-calls-message"), 1)
      })

      it(`has a link to skip financial aid for ${status}`, () => {
        const program = programWithStatus(status)
        const setConfirmSkipDialogVisibility = sandbox.stub()
        const wrapper = renderCard({ program, setConfirmSkipDialogVisibility })
        wrapper.find(".full-price").simulate("click")
        sinon.assert.calledWith(setConfirmSkipDialogVisibility, true)
      })
    }

    describe("documents", () => {
      it(`provides a datepicker which updates state for status ${FA_STATUS_PENDING_DOCS}`, () => {
        const program = programWithStatus(FA_STATUS_PENDING_DOCS)

        const setDocumentSentDate = sandbox.stub()
        const wrapper = renderCard({ program, setDocumentSentDate })
        const props = wrapper.find(DatePicker).props()
        assert.equal(
          moment(props.selected).format(ISO_8601_FORMAT),
          "2011-11-11"
        )
        props.onChange(moment("1999-01-01"))
        sinon.assert.calledWith(setDocumentSentDate, "1999-01-01")
      })

      it(`provides a link to open a dialog with complete instruction for status ${FA_STATUS_PENDING_DOCS}`, () => {
        const program = programWithStatus(FA_STATUS_PENDING_DOCS)
        const wrapper = renderCard({ program, setDocsInstructionsVisibility })
        const link = wrapper
          .find(".financial-aid-box")
          .find(".btn-instructions")
        link.simulate("click")
        assert.ok(
          setDocsInstructionsVisibility.called,
          "should have called onClick handler"
        )
      })

      it(`instruction for status ${FA_STATUS_PENDING_DOCS}`, () => {
        const program = programWithStatus(FA_STATUS_PENDING_DOCS)
        const wrapper = renderCard({ program, setDocsInstructionsVisibility })
        const instruction = wrapper
          .find(".financial-aid-box")
          .find("div")
          .first()
        assert.equal(
          instruction.text(),
          "Before you can pay, you need to verify your income. " +
            "Please visit the secure DocuSign website to upload an English-translated and notarized income tax or income statement document. " +
            "You can also send documents by mail. DO NOT SEND BY EMAIL." +
            "Read Complete Instructions"
        )
      })

      it("sends the document date", () => {
        const program = programWithStatus(FA_STATUS_PENDING_DOCS)

        const updateDocumentSentDate = sandbox.stub()
        updateDocumentSentDate.returns(Promise.resolve())
        const wrapper = renderCard({ program, updateDocumentSentDate })
        wrapper
          .find(".document-sent-button")
          .hostNodes()
          .simulate("click")
        sinon.assert.calledWith(updateDocumentSentDate, 123, "2011-11-11")
      })

      for (const activity of [true, false]) {
        it(`has a document sent button with API activity = ${activity.toString()}`, () => {
          const program = programWithStatus(FA_STATUS_PENDING_DOCS)

          const wrapper = renderCard({
            program,
            documents: {
              documentSentDate: "2011-11-11",
              fetchStatus:      activity ? FETCH_PROCESSING : undefined
            }
          })

          const button = wrapper.find("SpinnerButton")
          assert.include(button.props().className, "document-sent-button")
          assert.equal(button.props().spinning, activity)
        })
      }

      for (const status of [
        FA_STATUS_DOCS_SENT,
        FA_STATUS_PENDING_MANUAL_APPROVAL
      ]) {
        it(`shows the document sent date for status ${status}`, () => {
          const program = programWithStatus(status)
          const wrapper = renderCard({ program })
          assert.include(
            wrapper.text(),
            "Documents mailed/uploaded on March 3, 2003"
          )
        })
      }
    })
  })

  it("hides the skip dialog if the cancel button is clicked", () => {
    const program = programWithStatus(FA_STATUS_DOCS_SENT)
    const setConfirmSkipDialogVisibility = sandbox.stub()
    const wrapper = renderCard({ program, setConfirmSkipDialogVisibility })
    wrapper
      .find("SkipFinancialAidDialog")
      .props()
      .cancel()
    sinon.assert.calledWith(setConfirmSkipDialogVisibility, false)
  })
})
