// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import Icon from 'react-mdl/lib/Icon';

import DateField from '../inputs/DateField';
import type { CoursePrice } from '../../flow/dashboardTypes';
import type { Program } from '../../flow/programTypes';
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
} from '../../constants';

const price = price => <span className="price">{ formatPrice(price) }</span>;

export default class FinancialAidCard extends React.Component {
  props: {
    program: Program,
    coursePrice: CoursePrice,
    openFinancialAidCalculator: () => void,
    documentSentDate: Object,
    setDocumentSentDate: Function,
  };

  renderDocumentStatus() {
    const {
      setDocumentSentDate,
      documentSentDate,
    } = this.props;
    const { application_status: applicationStatus } = this.props.program.financial_aid_user_info;

    let errors = {};
    if (documentSentDate.edit !== undefined) {
      errors = documentSentDate.edit.errors;
    }

    switch (applicationStatus) {
    case FA_STATUS_PENDING_MANUAL_APPROVAL:
    case FA_STATUS_DOCS_SENT:
      return <div className="documents-sent">
        <Icon name="done" key="icon" />
        Documents mailed on mm/dd/yyyy. We will review your documents as soon as possible.
      </div>;
    case FA_STATUS_PENDING_DOCS:
      return <div>
        <Grid>
          <Cell col={12}>
            Please tell us the date you sent the documents
          </Cell>
        </Grid>
        <div className="document-row">
          <DateField
            data={documentSentDate}
            updateHandler={setDocumentSentDate}
            keySet={['date']}
            errors={errors}
            label=""
            omitDay={false}
            validator={() => null}
          />
          <Button className="dashboard-button">
            Submit
          </Button>
        </div>
      </div>;
    default:
      // should not get here
      return null;
    }
  }

  renderInitialAidPrompt() {
    const {
      program,
      openFinancialAidCalculator,
    } = this.props;
    const {
      min_possible_cost: minPossibleCost,
      max_possible_cost: maxPossibleCost,
    } = program.financial_aid_user_info;

    return <div className="personalized-pricing">
      <div className="heading">
        How much does it cost?
        { courseListToolTip('filler-text', 'course-price') }
      </div>
      <div className="explanation">
        Courses cost varies between {price(minPossibleCost)} and {price(maxPossibleCost)} (full
        price), depending on your income and ability to pay.
      </div>
      <button
        className="mm-button dashboard-button"
        onClick={openFinancialAidCalculator}
      >
        Calculate your cost
      </button>
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
          Your cost is <b>{price(coursePrice.course_price)} per course</b>.
        </Cell>
      </Grid>;
    case FA_STATUS_PENDING_MANUAL_APPROVAL:
    case FA_STATUS_DOCS_SENT:
    case FA_STATUS_PENDING_DOCS:
      return <div>
        <Grid>
          <Cell col={12}>
            Your cost is {price(coursePrice.course_price)} per course.
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
    const { program } = this.props;

    let contents;
    if (!program.financial_aid_user_info.has_user_applied) {
      contents = this.renderInitialAidPrompt();
    } else {
      contents = this.renderAidApplicationStatus();
    }

    return <Card shadow={0}>
      <CardTitle>Pricing Based on Income</CardTitle>
      <div>
        {contents}
      </div>
    </Card>;
  }
}