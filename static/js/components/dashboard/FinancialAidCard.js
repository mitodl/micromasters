// @flow
import React from "react"
import Button from "@material-ui/core/Button"
import Grid from "@material-ui/core/Grid"
import Card from "@material-ui/core/Card"
import Icon from "@material-ui/core/Icon"
import DatePicker from "react-datepicker"
import moment from "moment"

import { FETCH_PROCESSING } from "../../actions"
import SpinnerButton from "../SpinnerButton"
import type { CouponPrices } from "../../flow/couponTypes"
import type { Program } from "../../flow/programTypes"
import type { FinancialAidState } from "../../reducers/financial_aid"
import type { DocumentsState } from "../../reducers/documents"
import { formatPrice } from "../../util/util"
import {
  FA_STATUS_APPROVED,
  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_PENDING_MANUAL_APPROVAL,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_SKIPPED,
  DASHBOARD_FORMAT,
  ISO_8601_FORMAT
} from "../../constants"
import SkipFinancialAidDialog from "../SkipFinancialAidDialog"
import type { UIState } from "../../reducers/ui"
import CardContent from "@material-ui/core/CardContent"

const price = price => <span className="bold">{formatPrice(price)}</span>

export default class FinancialAidCard extends React.Component {
  props: {
    couponPrices: CouponPrices,
    documents: DocumentsState,
    financialAid: FinancialAidState,
    openFinancialAidCalculator: () => void,
    program: Program,
    setConfirmSkipDialogVisibility: (b: boolean) => void,
    setDocsInstructionsVisibility: (b: boolean) => void,
    setDocumentSentDate: (sentDate: string) => void,
    skipFinancialAid: (p: number) => Promise<*>,
    ui: UIState,
    updateDocumentSentDate: (
      financialAidId: number,
      sentDate: string
    ) => Promise<*>
  }

  submitDocuments = (): void => {
    const { program, documents, updateDocumentSentDate } = this.props
    const financialAidId = program.financial_aid_user_info.id

    updateDocumentSentDate(financialAidId, documents.documentSentDate)
  }

  setDocumentSentDate = (dateObj: Date): void => {
    const { setDocumentSentDate } = this.props
    if (dateObj) {
      setDocumentSentDate(moment(dateObj).format(ISO_8601_FORMAT))
    }
  }

  renderDocumentStatus() {
    const {
      documents: { documentSentDate, fetchStatus },
      program: {
        financial_aid_user_info: {
          application_status: applicationStatus,
          date_documents_sent: dateDocumentsSent
        }
      }
    } = this.props

    switch (applicationStatus) {
    case FA_STATUS_PENDING_MANUAL_APPROVAL:
    case FA_STATUS_DOCS_SENT:
      return (
        <div className="documents-sent">
          <Icon key="icon">done</Icon>
            Documents mailed/uploaded on {``}
          {moment(dateDocumentsSent).format(DASHBOARD_FORMAT)}. We will review
            your documents as soon as possible.
        </div>
      )
    case FA_STATUS_PENDING_DOCS:
      return (
        <div>
          <Grid container spacing={3}>
            <Grid item xs={12}>
                Please tell us the date you sent the documents
            </Grid>
          </Grid>
          <Grid container spacing={3} className="document-row">
            <Grid item xs={12} className="document-sent-button-container">
              <DatePicker
                selected={moment(documentSentDate).toDate()}
                onChange={this.setDocumentSentDate}
              />
              <SpinnerButton
                className="dashboard-button document-sent-button"
                component={Button}
                onClick={this.submitDocuments}
                spinning={fetchStatus === FETCH_PROCESSING}
              >
                  Submit
              </SpinnerButton>
            </Grid>
          </Grid>
        </div>
      )
    default:
        // should not get here
      return null
    }
  }

  renderInitialAidPrompt() {
    const {
      program: {
        financial_aid_user_info: {
          min_possible_cost: minPossibleCost,
          max_possible_cost: maxPossibleCost
        },
        title
      },
      openFinancialAidCalculator,
      setConfirmSkipDialogVisibility
    } = this.props

    return (
      <div className="personalized-pricing">
        <div className="coupon-explanation">
          <span className="bold">Do you have a coupon?</span> Please determine
          your course pricing below. The coupon will be applied at checkout.
        </div>
        <div className="grey-box">
          <div className="heading">How much does it cost?</div>
          <div className="explanation">
            The cost of courses in the {title} MicroMasters varies between{" "}
            {price(minPossibleCost)} and {price(maxPossibleCost)}, depending on
            your income and ability to pay.
          </div>
          <div className="pricing-actions">
            <button
              className="mdl-button dashboard-button calculate-cost-button"
              onClick={openFinancialAidCalculator}
            >
              Get My Price Now
            </button>
            <button
              className="mm-minor-action full-price"
              onClick={() => setConfirmSkipDialogVisibility(true)}
            >
              Skip this and Pay Full Price
            </button>
          </div>
        </div>
      </div>
    )
  }

  renderAidApplicationStatus() {
    const {
      program,
      couponPrices,
      setConfirmSkipDialogVisibility,
      setDocsInstructionsVisibility
    } = this.props

    const couponPrice = couponPrices.pricesInclCouponByProgram.get(program.id)
    if (!couponPrice) {
      // shouldn't happen, at this point we should have prices for all programs
      throw new Error(`Unable to find price for program ${program.id}`)
    }
    const calculatedPrice = couponPrice.price

    switch (program.financial_aid_user_info.application_status) {
    case FA_STATUS_APPROVED:
    case FA_STATUS_AUTO_APPROVED:
    case FA_STATUS_SKIPPED:
      return null
    case FA_STATUS_PENDING_MANUAL_APPROVAL:
    case FA_STATUS_DOCS_SENT:
    case FA_STATUS_PENDING_DOCS:
      return (
        <div>
          <Grid container className="grid-padding">
            <Grid item xs={12} className="price-explanation">
              <div>Your cost is {price(calculatedPrice)} per course.</div>
              <button
                className="mm-minor-action full-price"
                onClick={() => setConfirmSkipDialogVisibility(true)}
              >
                  Skip this and Pay Full Price
              </button>
            </Grid>
          </Grid>

          <Grid container spacing={1} className="financial-aid-box">
            <Grid item xs={12}>
                Before you can pay, you need to verify your income. Please visit
                the{" "}
              <a href="https://na2.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=4a74536d-1629-4709-b8e9-f173a51cf501&env=na2&v=2">
                  secure DocuSign website
              </a>{" "}
                to upload an English-translated and notarized income tax or
                income statement document. You can also send documents by mail.
                DO NOT SEND BY EMAIL.
            </Grid>
            <Grid item xs={12}>
              <a
                className="btn-instructions"
                onClick={() => setDocsInstructionsVisibility(true)}
              >
                  Read Complete Instructions
              </a>
            </Grid>
          </Grid>

          <Grid container spacing={2} className="grid-padding">
            <Grid item xs={6}>
                Upload to DocuSign
            </Grid>
            <Grid item xs={6}>
                Mail to
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <a href="https://na2.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=4a74536d-1629-4709-b8e9-f173a51cf501&env=na2&v=2">
                  https://na2.docusign.net/Member/
                  PowerFormSigning.aspx?PowerFormId=4a74536d-1629-4709-b8e9-f173a51cf501&env=na2&v=2
              </a>
            </Grid>
            <Grid item xs={6}>
                J-PAL
              <br />
                DEDP MicroMasters
              <br />
                Massachusetts Institute of Technology
              <br />
                77 Massachusetts Avenue E19-235D
              <br />
                Cambridge, MA 02139 United States of America
              <br />
            </Grid>
          </Grid>

          <hr />
          {this.renderDocumentStatus()}
        </div>
      )
      // FA_STATUS_CREATED should not be seen here
    default:
      return null
    }
  }

  render() {
    const {
      program,
      program: {
        financial_aid_user_info: { max_possible_cost: maxPossibleCost }
      },
      ui: { skipDialogVisibility },
      setConfirmSkipDialogVisibility,
      skipFinancialAid,
      financialAid
    } = this.props

    let contents
    if (!program.financial_aid_user_info.has_user_applied) {
      contents = this.renderInitialAidPrompt()
    } else {
      contents = this.renderAidApplicationStatus()
    }

    if (!contents) {
      return null
    }

    return (
      <Card shadow={0} className="card financial-aid-card">
        <SkipFinancialAidDialog
          open={skipDialogVisibility}
          cancel={() => setConfirmSkipDialogVisibility(false)}
          skip={() => skipFinancialAid(program.id)}
          fullPrice={price(maxPossibleCost)}
          fetchAddStatus={financialAid.fetchAddStatus}
          fetchSkipStatus={financialAid.fetchSkipStatus}
        />
        <CardContent>
          <h2>Personal Course Pricing</h2>
          <div>{contents}</div>
          <div className="no-calls-message">
            If you have questions, contact us using the Help button at the
            bottom of the page, or e-mail{" "}
            <a href="mailto:micromasters-support@mit.edu">
              micromasters-support@mit.edu
            </a>
            . Due to high volume of inquiries we do not have a support phone
            number at this time.
          </div>
        </CardContent>
      </Card>
    )
  }
}
