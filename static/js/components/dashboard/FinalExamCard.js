// @flow
/* global SETTINGS: false */
import React from 'react';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import Button from 'react-mdl/lib/Button';
import IconButton from 'react-mdl/lib/IconButton';
import _ from 'lodash';
import R from 'ramda';
import Dialog from 'material-ui/Dialog';

import { dialogActions } from '../inputs/util';
import type { Profile } from '../../flow/profileTypes';
import type { Program } from '../../flow/programTypes';
import type { UIState } from '../../reducers/ui';
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

const cardWrapper = (...children) => (
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
          <a href="http://www.pearsonvue.com/mitx/locate/" target="_blank">
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

const absentCard = () => cardWrapper(
  <p key="absent">
    We will notify you when you become eligible to schedule course exams.
  </p>
);

const successCard = (profile, navigateToProfile) => cardWrapper(
  accountCreated(profile, navigateToProfile),
  <div className="currently-ineligible" key="not-eligible">
    We will notify you when you become eligible to schedule course exams.
  </div>
);


const pendingCard = () => cardWrapper(
  <div className="info-box" key="pending">
    Your updated information has been submitted to Pearson. Please check back later.
  </div>
);

const invalidCard = navigateToProfile => cardWrapper(
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

const renderPearsonTOSDialog = (open, show, submitPearsonSSO, pearson) => (
  <Dialog
    key="pearson-tos-dialog"
    contentClassName="dialog content"
    className="dialog-to-pearson-site"
    actionsContainerClassName="actions"
    open={open}
    onRequestClose={() => show(false)}
    actions={dialogActions(() => show(false), submitPearsonSSO, isProcessing(pearson), "CONTINUE")}
    autoScrollBodyContent={true}>
    <div className="dialog-container">
      <img src="/static/images/pearson_vue.png" width="180"/>
      <h3 className="dialog-title">Test Registration is completed on the <br/>Pearson VUE website</h3>
      <p>
        I acknowledge that by clicking Continue I will be leaving the MicroMasters <br/>website and going to
        the Pearson VUE website, and that I accept the <br/>Pearson VUE Group’s <a target="_blank"
          href="https://home.pearsonvue.com/Legal/Privacy-and-cookies-policy.aspx">Terms of Service</a>.
      </p>
    </div>
  </Dialog>
);

const schedulableCard = (
  profile,
  program,
  navigateToProfile,
  pearson,
  showPearsonTOSDialog,
  open,
  submitPearsonSSO
) => cardWrapper(
  renderPearsonTOSDialog(open, showPearsonTOSDialog, submitPearsonSSO, pearson),
  accountCreated(profile, navigateToProfile),
  <div key="schedulable" className="exam-scheduling">
    <Button
      type='ok'
      className="mdl-button exam-button"
      onClick={() => showPearsonTOSDialog(true)}
    >
      Schedule an exam
    </Button>
    <div className="program-info">
      You are ready to schedule an exam for:
      <ul>
        { schedulableCourseList(program) }
      </ul>
    </div>
  </div>,
  errorDisplay(pearson)
);

type Props = {
  profile:              Profile,
  program:              Program,
  navigateToProfile:    () => void,
  submitPearsonSSO:     () => void,
  pearson:              PearsonAPIState,
  ui:                   UIState,
  showPearsonTOSDialog: (open: boolean) => void,
};

export default class FinalExamCard extends React.Component<void, Props, void> {
  render () {
    const {
      profile,
      program,
      navigateToProfile,
      submitPearsonSSO,
      pearson,
      ui: { dialogVisibility: { pearsonTOSDialogVisible = false } },
      showPearsonTOSDialog
    } = this.props;

    if (!SETTINGS.FEATURES.EXAMS) {
      return null;
    }

    switch (program.pearson_exam_status) {
    case PEARSON_PROFILE_ABSENT:
      return absentCard();
    case PEARSON_PROFILE_SUCCESS:
      return successCard(profile, navigateToProfile);
    case PEARSON_PROFILE_IN_PROGRESS:
      return pendingCard();
    case PEARSON_PROFILE_INVALID:
      return invalidCard(navigateToProfile);
    case PEARSON_PROFILE_SCHEDULABLE:
      return schedulableCard(
        profile,
        program,
        navigateToProfile,
        pearson,
        showPearsonTOSDialog,
        pearsonTOSDialogVisible,
        submitPearsonSSO
      );
    default:
      return null;
    }
  }
}
