// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import Icon from 'react-mdl/lib/Icon';
import DatePicker from 'react-datepicker';
import moment from 'moment';

import { FETCH_PROCESSING } from '../../actions';
import SpinnerButton from '../SpinnerButton';
import type { CouponPrices } from '../../flow/couponTypes';
import type { Program } from '../../flow/programTypes';
import type { FinancialAidState } from '../../reducers/financial_aid';
import type {
  DocumentsState,
} from '../../reducers/documents';
import { formatPrice } from '../../util/util';
import {
  FA_STATUS_APPROVED,
  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_PENDING_MANUAL_APPROVAL,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_SKIPPED,
  DASHBOARD_FORMAT,
  ISO_8601_FORMAT,
} from '../../constants';
import SkipFinancialAidDialog from '../SkipFinancialAidDialog';
import type { UIState } from '../../reducers/ui';

const price = price => <span className="price">{ formatPrice(price) }</span>;

export default class FinancialAidCard extends React.Component {
  props: {
    couponPrices:                   CouponPrices,
    documents:                      DocumentsState,
    financialAid:                   FinancialAidState,
    openFinancialAidCalculator:     () => void,
    program:                        Program,
    setConfirmSkipDialogVisibility: (b: boolean) => void,
    setDocsInstructionsVisibility:  (b: boolean) => void,
    setDocumentSentDate:            (sentDate: string) => void,
    skipFinancialAid:               (p: number) => void,
    ui:                             UIState,
    updateDocumentSentDate:         (financialAidId: number, sentDate: string) => Promise<*>,
  };

  submitDocuments = (): void => {
    const {
      program,
      documents,
      updateDocumentSentDate,
    } = this.props;
    const financialAidId = program.financial_aid_user_info.id;

    updateDocumentSentDate(financialAidId, documents.documentSentDate);
  };

  setDocumentSentDate = (dateObj: moment): void => {
    const { setDocumentSentDate } = this.props;
    if (dateObj) {
      setDocumentSentDate(dateObj.format(ISO_8601_FORMAT));
    }
  }

  renderDocumentStatus() {
    const {
      documents: {
        documentSentDate,
        fetchStatus,
      },
      program: {
        financial_aid_user_info: {
          application_status: applicationStatus,
          date_documents_sent: dateDocumentsSent,
        }
      }
    } = this.props;

    switch (applicationStatus) {
    case FA_STATUS_PENDING_MANUAL_APPROVAL:
    case FA_STATUS_DOCS_SENT:
      return <div className="documents-sent">
        <Icon name="done" key="icon" />
        Documents mailed on {moment(dateDocumentsSent).format(DASHBOARD_FORMAT)}.
        We will review your documents as soon as possible.
      </div>;
    case FA_STATUS_PENDING_DOCS:
      return <div>
        <Grid>
          <Cell col={12} >
            Please tell us the date you sent the documents
          </Cell>
        </Grid>
        <Grid className="document-row">
          <Cell col={12} className="document-sent-button-container">
            <DatePicker
              selected={moment(documentSentDate)}
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
          </Cell>
        </Grid>
      </div>;
    default:
      // should not get here
      return null;
    }
  }

  renderInitialAidPrompt() {
    const {
      program: {
        financial_aid_user_info: {
          min_possible_cost: minPossibleCost,
          max_possible_cost: maxPossibleCost,
        },
        title,
      },
      openFinancialAidCalculator,
      setConfirmSkipDialogVisibility,
    } = this.props;

    return <div className="personalized-pricing">
      <div className="heading">
        How much does it cost?
      </div>
      <div className="explanation">
        The cost of courses in the {title} MicroMasters varies
        between {price(minPossibleCost)} and {price(maxPossibleCost)},
        depending on your income and ability to pay.
      </div>
      <div className="pricing-actions">
        <button
          className="mdl-button dashboard-button calculate-cost-button"
          onClick={openFinancialAidCalculator}
        >
          Get My Price Now
        </button>
        <button className="mm-minor-action full-price" onClick={() => setConfirmSkipDialogVisibility(true)}>
          Skip this and Pay Full Price
        </button>
      </div>
    </div>;
  }

  renderAidApplicationStatus() {
    const {
      program,
      couponPrices,
      setConfirmSkipDialogVisibility,
      setDocsInstructionsVisibility,
    } = this.props;

    let couponPrice = couponPrices.pricesInclCouponByProgram.get(program.id);
    if (!couponPrice) {
      // shouldn't happen, at this point we should have prices for all programs
      throw `Unable to find price for program ${program.id}`;
    }
    let calculatedPrice = couponPrice.price;

    switch (program.financial_aid_user_info.application_status) {
    case FA_STATUS_APPROVED:
    case FA_STATUS_AUTO_APPROVED:
    case FA_STATUS_SKIPPED:
      return null;
    case FA_STATUS_PENDING_MANUAL_APPROVAL:
    case FA_STATUS_DOCS_SENT:
    case FA_STATUS_PENDING_DOCS:
      return <div>
        <Grid>
          <Cell col={12} className="price-explanation">
            <div>
              Your cost is {price(calculatedPrice)} per course.
            </div>
            <button className="mm-minor-action full-price" onClick={() => setConfirmSkipDialogVisibility(true)}>
              Skip this and Pay Full Price
            </button>
          </Cell>
        </Grid>

        <Grid className="financial-aid-box">
          <Cell col={12}>
            Before you can pay, you need to verify your income. Please mail or fax an
            English-translated and notarized income tax or income statement document.
            DO NOT SEND BY EMAIL.
          </Cell>
          <Cell col={12}>
            <a onClick={() => setDocsInstructionsVisibility(true)}>
              Read Complete Instructions
            </a>
          </Cell>
        </Grid>

        <Grid>
          <Cell col={1} />
          <Cell col={5}>
            Mail to
          </Cell>
          <Cell col={6}>
            or fax
          </Cell>
        </Grid>

        <Grid>
          <Cell col={1} />
          <Cell col={5}>
            J-PAL<br />
            DEDP MicroMasters<br />
            Massachusetts Institute of Technology<br />
            77 Massachusetts Avenue E19-235D<br />
            Cambridge, MA 02139 United States of America<br />
          </Cell>
          <Cell col={6}>
            1 (617) 715-5799
          </Cell>
        </Grid>

        <hr />
        {this.renderDocumentStatus()}
      </div>;
    // FA_STATUS_CREATED should not be seen here
    default:
      return null;
    }
  }

  render() {
    const {
      program,
      program: {
        financial_aid_user_info: {
          max_possible_cost: maxPossibleCost,
        }
      },
      ui: { skipDialogVisibility },
      setConfirmSkipDialogVisibility,
      skipFinancialAid,
      financialAid,
    } = this.props;

    let contents;
    if (!program.financial_aid_user_info.has_user_applied) {
      contents = this.renderInitialAidPrompt();
    } else {
      contents = this.renderAidApplicationStatus();
    }

    if (!contents) {
      return null;
    }

    return <Card shadow={0} className="financial-aid-card">
      <SkipFinancialAidDialog
        open={skipDialogVisibility}
        cancel={() => setConfirmSkipDialogVisibility(false)}
        skip={() => skipFinancialAid(program.id)}
        fullPrice={price(maxPossibleCost)}
        fetchAddStatus={financialAid.fetchAddStatus}
        fetchSkipStatus={financialAid.fetchSkipStatus}
      />
      <CardTitle>Personal Course Pricing</CardTitle>
      <div>
        {contents}
      </div>
      <div className="no-calls-message">
        If you have questions, contact us using the Help button at the bottom of the page,
        or e-mail <a href="mailto:micromasters-support@mit.edu">micromasters-support@mit.edu</a>.
        Due to high volume of inquiries we do not have a support phone number at this time.
      </div>
    </Card>;
  }
}
