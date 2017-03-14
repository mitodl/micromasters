// @flow
/* global SETTINGS: false */
import React from 'react';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import Button from 'react-mdl/lib/Button';
import IconButton from 'react-mdl/lib/IconButton';
import _ from 'lodash';
import R from 'ramda';

import SpinnerButton from '../SpinnerButton';
import type { Profile } from '../../flow/profileTypes';
import type { Program } from '../../flow/programTypes';
import type { UIState } from '../../reducers/ui';
import ConfirmToPearsonSiteDialog from '../exam/ConfirmToPearsonSiteDialog';
import {
  PEARSON_PROFILE_ABSENT,
  PEARSON_PROFILE_SUCCESS,
  PEARSON_PROFILE_IN_PROGRESS,
  PEARSON_PROFILE_INVALID,
  PEARSON_PROFILE_SCHEDULABLE
} from '../../constants';
import { FETCH_PROCESSING } from '../../actions';
import { getRomanizedName, getLocation } from '../../util/util';
import type { PearsonAPIState } from '../../reducers/pearson';

const getPostalCode = profile => (
  profile.postal_code !== null ? <span>{ profile.postal_code }</span> : null
);

const accountCreated = (profile, navigateToProfile) => (
  <div key="profile">
    <div className="info-box split">
      <div className="flow">
        Your Pearson Testing account has been created. Your information
        should match the ID you bring to the test center.
      </div>
      <div className="address-info">
        <div className="address">
          <span className="name">
            { getRomanizedName(profile) }
          </span>
          <span>
            { _.get(profile, ['address']) }
          </span>
          <span>
            { getLocation(profile) }
          </span>
          { getPostalCode(profile) }
          <span>
            Phone: { _.get(profile, ['phone_number']) }
          </span>
        </div>
        { editProfileButton(navigateToProfile) }
      </div>
    </div>
  </div>
);

const editProfileButton = fn => (
  <IconButton name="edit" onClick={fn} />
);

const isProcessing = R.compose(
  R.any(R.equals(FETCH_PROCESSING)), R.props(['getStatus', 'postStatus']), R.defaultTo({})
);

const errorDisplay = pearson => (
  R.isNil(pearson.error) ? null : <div className="error" key="error">{ pearson.error }</div>
);

const listItem = (text, index) => (<li key={index}>{ text }</li>);

const schedulableCourseList = R.compose(
  R.addIndex(R.map)(listItem),
  R.map(R.prop('title')),
  R.filter(R.propEq('can_schedule_exam', true)),
  R.propOr([], 'courses'),
  R.defaultTo({}),
);

type Props = {
  profile:            Profile,
  program:            Program,
  navigateToProfile:  () => void,
  submitPearsonSSO:   () => void,
  pearson:            PearsonAPIState,
  ui:                 UIState,
  showToPearsonSiteDialog: () => void,
};

export default class FinalExamCard extends React.Component<void, Props, void> {
  cardWrapper = (...children) => {
    const { showToPearsonSiteDialog } = this.props;
    return (
      <Card shadow={0} className="final-exam-card">
        <div className="card-header">
          <div>
            <img className="exam-icon" src="/static/images/exam_icon.png" />
          </div>
          <div>
            <CardTitle>
              Final Proctored Exam
            </CardTitle>
            <p>
              {`You must take a proctored exam for each course. Exams may be taken
                at any `}
              <a onClick={showToPearsonSiteDialog}>
                authorized Pearson test center
              </a>
              {`. Before you can take an exam, you have to pay for the course and
              pass the online work.`}
            </p>
          </div>
        </div>
        {children}
      </Card>
    );
  }

  schedulableCard = (profile, program, navigateToProfile, submitPearsonSSO, pearson) => this.cardWrapper(
    accountCreated(profile, navigateToProfile),
    <div key="schedulable" className="exam-scheduling">
      <SpinnerButton
        className="mdl-button exam-button"
        component={Button}
        spinning={isProcessing(pearson)}
        onClick={submitPearsonSSO}
        ignoreRecentlyClicked={true}
      >
        Schedule an exam
      </SpinnerButton>
      <div className="program-info">
        You are ready to schedule an exam for:
        <ul>
          { schedulableCourseList(program) }
        </ul>
      </div>
    </div>,
    errorDisplay(pearson)
  );

  pendingCard = () => this.cardWrapper(
    <div className="info-box" key="pending">
      Your updated information has been submitted to Pearson. Please check back later.
    </div>
  );

  invalidCard = navigateToProfile => this.cardWrapper(
    <div className="info-box" key="invalid">
      { editProfileButton(navigateToProfile) }
      <div>
        You need to
        {" "}
        <a onClick={navigateToProfile}>
          update your profile
        </a>
        {" "}
        in order to take a test at a Pearson Test center.
      </div>
    </div>
  );

  absentCard = () => this.cardWrapper(
    <p key="absent">
      We will notify you when you become eligible to schedule course exams.
    </p>
  );

  successCard = (profile, navigateToProfile) => this.cardWrapper(
    accountCreated(profile, navigateToProfile),
    <div className="currently-ineligible" key="not-eligible">
      We will notify you when you become eligible to schedule course exams.
    </div>
  );

  render () {
    const {
      profile,
      program,
      navigateToProfile,
      submitPearsonSSO,
      pearson,
      ui,
      showToPearsonSiteDialog
    } = this.props;

    if (!SETTINGS.FEATURES.EXAMS) {
      return null;
    }
    let content = null;
    switch (program.pearson_exam_status) {
    case PEARSON_PROFILE_ABSENT:
      content = this.absentCard();
      break;
    case PEARSON_PROFILE_SUCCESS:
      content = this.successCard(profile, navigateToProfile);
      break;
    case PEARSON_PROFILE_IN_PROGRESS:
      content = this.pendingCard();
      break;
    case PEARSON_PROFILE_INVALID:
      content = this.invalidCard(navigateToProfile);
      break;
    case PEARSON_PROFILE_SCHEDULABLE:
      content = this.schedulableCard(profile, program, navigateToProfile, submitPearsonSSO, pearson);
      break;
    }

    return (
      <div>
        <ConfirmToPearsonSiteDialog
          open={ui.showToPearsonSiteDialog}
          show={showToPearsonSiteDialog} />
        {content}
      </div>
    );
  }
}
