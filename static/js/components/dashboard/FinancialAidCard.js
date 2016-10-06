// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import Icon from 'react-mdl/lib/Icon';
import DatePicker from 'react-datepicker';
import moment from 'moment';

import type { CoursePrice } from '../../flow/dashboardTypes';
import type { Program } from '../../flow/programTypes';
import type {
  DocumentsState,
} from '../../reducers/documents';
import { courseListToolTip } from './util';
import { formatPrice } from '../../util/util';
import {
  FA_STATUS_APPROVED,
  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_PENDING_MANUAL_APPROVAL,
  FA_STATUS_REJECTED,
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
    program:                        Program,
    coursePrice:                    CoursePrice,
    openFinancialAidCalculator:     () => void,
    skipFinancialAid:               (p: number) => void,
    documents:                      DocumentsState,
    setDocumentSentDate:            (sentDate: string) => void,
    updateDocumentSentDate:         (financialAidId: number, sentDate: string) => Promise<*>,
    fetchDashboard:                 () => void,
    setConfirmSkipDialogVisibility: (b: boolean) => void,
    ui:                             UIState,
    skipFinancialAid:               () => void,
  };

  submitDocuments = (): void => {
    const {
      fetchDashboard,
      program,
      documents,
      updateDocumentSentDate,
    } = this.props;
    const financialAidId = program.financial_aid_user_info.id;

    updateDocumentSentDate(financialAidId, documents.documentSentDate).then(fetchDashboard);
  };

  renderDocumentStatus() {
    const {
      setDocumentSentDate,
      documents,
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
          <Cell col={12}>
            Please tell us the date you sent the documents
          </Cell>
        </Grid>
        <Grid className="document-row">
          <Cell col={12}>
            <DatePicker
              selected={moment(documents.documentSentDate)}
              onChange={(obj) => setDocumentSentDate(obj.format(ISO_8601_FORMAT))}
            />
            <Button className="dashboard-button" onClick={this.submitDocuments}>
              Submit
            </Button>
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
        }
      },
      openFinancialAidCalculator,
      setConfirmSkipDialogVisibility,
    } = this.props;

    return <div className="personalized-pricing">
      <div className="heading">
        How much does it cost?
        { courseListToolTip('filler-text', 'course-price') }
      </div>
      <div className="explanation">
        Courses cost varies between {price(minPossibleCost)} and {price(maxPossibleCost)} (full
        price), depending on your income and ability to pay.
      </div>
      <div className="pricing-actions">
        <button
          className="mm-button dashboard-button"
          onClick={openFinancialAidCalculator}
        >
          Calculate your cost
        </button>
        <a className="full-price" onClick={() => setConfirmSkipDialogVisibility(true)}>
          Skip this and Pay Full Price
        </a>
      </div>
    </div>;
  }

  renderAidApplicationStatus() {
    const {
      program,
      coursePrice,
    } = this.props;

    switch (program.financial_aid_user_info.application_status) {
    case FA_STATUS_APPROVED:
    case FA_STATUS_AUTO_APPROVED:
    case FA_STATUS_REJECTED:
    case FA_STATUS_SKIPPED:
      return <Grid className="financial-aid-box">
        <Cell col={12}>
          Your cost is <b>{price(coursePrice.price)} per course</b>.
        </Cell>
      </Grid>;
    case FA_STATUS_PENDING_MANUAL_APPROVAL:
    case FA_STATUS_DOCS_SENT:
    case FA_STATUS_PENDING_DOCS:
      return <div>
        <Grid>
          <Cell col={12}>
            Your cost is {price(coursePrice.price)} per course.
          </Cell>
        </Grid>

        <Grid className="financial-aid-box">
          <Cell col={12}>
            Before you can pay, you need to verify your income by mailing or faxing one
            of the following documents:
            <ul>
              <li>A notarized document verifying income</li>
            </ul>
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
            MIT, Economics Department<br />
            100 Main Street<br />
            Cambridge, MA 02139
          </Cell>
          <Cell col={6}>
            001 (999) 999-9999
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
    } = this.props;

    let contents;
    if (!program.financial_aid_user_info.has_user_applied) {
      contents = this.renderInitialAidPrompt();
    } else {
      contents = this.renderAidApplicationStatus();
    }

    return <Card shadow={0}>
      <SkipFinancialAidDialog
        open={skipDialogVisibility}
        cancel={() => setConfirmSkipDialogVisibility(false)}
        skip={() => skipFinancialAid(program.id)}
        fullPrice={price(maxPossibleCost)}
      />
      <CardTitle>Pricing Based on Income</CardTitle>
      <div>
        {contents}
      </div>
    </Card>;
  }
}
