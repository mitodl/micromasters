// @flow
/* global SETTINGS: false */
import React from "react"
import Card from "@material-ui/core/Card"
import CardContent from "@material-ui/core/CardContent"
import IconButton from "@material-ui/core/IconButton"
import _ from "lodash"
import R from "ramda"
import Dialog from "@material-ui/core/Dialog"
import DialogContent from "@material-ui/core/DialogContent"

import { dialogActions } from "../inputs/util"
import type { Profile } from "../../flow/profileTypes"
import type { Program } from "../../flow/programTypes"
import type { UIState } from "../../reducers/ui"
import {
  PEARSON_PROFILE_ABSENT,
  PEARSON_PROFILE_SUCCESS,
  PEARSON_PROFILE_IN_PROGRESS,
  PEARSON_PROFILE_INVALID,
  PEARSON_PROFILE_SCHEDULABLE
} from "../../constants"
import { FETCH_PROCESSING } from "../../actions"
import { getRomanizedName, getLocation } from "../../util/util"
import type { PearsonAPIState } from "../../reducers/pearson"
import DialogActions from "@material-ui/core/DialogActions"
import Icon from "@material-ui/core/Icon"

const cardWrapper = (...children) => (
  <Card className="card final-exam-card">
    <CardContent>
      <div className="card-header">
        <div>
          <img className="exam-icon" src="/static/images/exam_icon.png" />
        </div>
        <div>
          <h2>Final Proctored Exam</h2>
          <p>
            {`You must take a proctored exam for each course. Exams may be taken
            at any `}
            <a
              href="http://www.pearsonvue.com/mitx/locate/"
              target="_blank"
              rel="noopener noreferrer"
            >
              authorized Pearson test center
            </a>
            {`. Before you can take an exam, you have to pay for the course and
          pass the online work.`}
          </p>
        </div>
      </div>

      {children}
    </CardContent>
  </Card>
)

const getPostalCode = profile =>
  profile.postal_code !== null ? <span>{profile.postal_code}</span> : null

const accountCreated = (profile, navigateToProfile) => (
  <div key="profile">
    <div className="info-box split">
      <div className="flow">
        Your Pearson Testing account has been created. Your information should
        match the ID you bring to the test center.
      </div>
      <div className="address-info">
        <div className="address">
          <span className="name">{getRomanizedName(profile)}</span>
          <span>{_.get(profile, ["address"])}</span>
          <span>{getLocation(profile)}</span>
          {getPostalCode(profile)}
          <span>Phone: {_.get(profile, ["phone_number"])}</span>
        </div>
        {editProfileButton(navigateToProfile)}
      </div>
    </div>
  </div>
)

const editProfileButton = fn => (
  <IconButton className="vertical-center" onClick={fn}>
    <Icon>edit</Icon>
  </IconButton>
)

const absentCard = () =>
  cardWrapper(
    <p key="absent">
      We will notify you when you become eligible to schedule course exams.
    </p>
  )

const successCard = (profile, navigateToProfile) =>
  cardWrapper(
    accountCreated(profile, navigateToProfile),
    <div className="currently-ineligible" key="not-eligible">
      We will notify you when you become eligible to schedule course exams.
    </div>
  )

const pendingCard = () =>
  cardWrapper(
    <div className="info-box" key="pending">
      Your updated information has been submitted to Pearson. Please check back
      later.
    </div>
  )

const invalidCard = navigateToProfile =>
  cardWrapper(
    <div className="info-box" key="invalid">
      {editProfileButton(navigateToProfile)}
      <div>
        You need to <a onClick={navigateToProfile}>update your profile</a> in
        order to take a test at a Pearson Test center.
      </div>
    </div>
  )

const isProcessing = R.compose(
  R.any(R.equals(FETCH_PROCESSING)),
  R.props(["getStatus", "postStatus"]),
  R.defaultTo({})
)

const errorDisplay = pearson =>
  R.isNil(pearson.error) ? null : (
    <div className="error" key="error">
      {pearson.error}
    </div>
  )

const listItem = (text, index) => <li key={index}>{text}</li>

const schedulableCourseList = R.compose(
  R.addIndex(R.map)(listItem),
  R.map(R.prop("title")),
  R.filter(R.propEq("can_schedule_exam", true)),
  R.propOr([], "courses"),
  R.defaultTo({})
)

const renderPearsonTOSDialog = (open, show, submitPearsonSSO, pearson) => (
  <Dialog
    key="pearson-tos-dialog"
    classes={{ paper: "dialog content" }}
    className="dialog-to-pearson-site"
    open={open}
    onClose={() => show(false)}
  >
    <DialogContent className="dialog-container">
      <img src="/static/images/pearson_vue.png" width="180" />
      <h3 className="dialog-title">
        You are being redirected to Pearson VUE’s website.
      </h3>
      <div className="tos-container">
        <p>
          You acknowledge that by clicking Continue, you will be leaving the
          MITx MicroMasters website and going to a third-party website over
          which MIT’s MITx does not have control, and that you accept the
          Pearson VUE Business Group’s{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://home.pearsonvue.com/Legal/Privacy-and-cookies-policy.aspx"
          >
            Terms of Service
          </a>
          . MIT is not responsible for the content of third-party sites
          hyper-linked from the Pearson VUE website, nor does MIT guarantee or
          endorse the information, recommendations, products or services offered
          on third-party sites.
        </p>
        <p>
          By clicking Continue, you further acknowledge, understand, and agree
          that:
        </p>
        <p>
          <b>
            MIT makes no representations or warranties of any kind regarding the
            facilities or services provided by Pearson VUE, including, but not
            limited to, at any Pearson VUE authorized testing center. MIT hereby
            disclaims all representations and warranties, express or implied,
            including, without limitation, accuracy and fitness for a particular
            purpose. To the extent permissible by law, you assume the risk of
            injury or loss or damage to property while visiting any Pearson VUE
            testing center for in-person testing for any MITx MicroMasters
            course (the “Purpose”). You hereby release MIT and all of its
            officers, directors, members, employees, volunteers, agents,
            administrators, assigns, and contractors (collectively “Releasees”),
            from any and all claims, demands, suits, judgments, damages, actions
            and liabilities of every kind and nature whatsoever, that you may
            suffer at any time as a result of the Purpose.
          </b>
        </p>
      </div>
      <p className="attention">
        By clicking Continue, I agree to above Terms and Conditions.
      </p>
    </DialogContent>
    <DialogActions>
      {dialogActions(
        () => show(false),
        submitPearsonSSO,
        isProcessing(pearson),
        "CONTINUE"
      )}
    </DialogActions>
  </Dialog>
)

const schedulableCard = (
  profile,
  program,
  navigateToProfile,
  pearson,
  showPearsonTOSDialog,
  open,
  submitPearsonSSO
) =>
  cardWrapper(
    renderPearsonTOSDialog(
      open,
      showPearsonTOSDialog,
      submitPearsonSSO,
      pearson
    ),
    accountCreated(profile, navigateToProfile),
    <div key="schedulable" className="exam-scheduling">
      <button
        className="mdl-button dashboard-button exam-button"
        onClick={() => showPearsonTOSDialog(true)}
      >
        Schedule an exam
      </button>
      <div className="program-info">
        You are ready to schedule an exam for:
        <ul>{schedulableCourseList(program)}</ul>
      </div>
    </div>,
    errorDisplay(pearson)
  )

type Props = {
  profile: Profile,
  program: Program,
  navigateToProfile: () => void,
  submitPearsonSSO: () => void,
  pearson: PearsonAPIState,
  ui: UIState,
  showPearsonTOSDialog: (open: boolean) => void
}

export default class FinalExamCard extends React.Component<void, Props, void> {
  render() {
    const {
      profile,
      program,
      navigateToProfile,
      submitPearsonSSO,
      pearson,
      ui: {
        dialogVisibility: { pearsonTOSDialogVisible = false }
      },
      showPearsonTOSDialog
    } = this.props
    if (!SETTINGS.FEATURES.ENABLE_EDX_EXAMS) {
      switch (program.pearson_exam_status) {
      case PEARSON_PROFILE_ABSENT:
        return absentCard()
      case PEARSON_PROFILE_SUCCESS:
        return successCard(profile, navigateToProfile)
      case PEARSON_PROFILE_IN_PROGRESS:
        return pendingCard()
      case PEARSON_PROFILE_INVALID:
        return invalidCard(navigateToProfile)
      case PEARSON_PROFILE_SCHEDULABLE:
        return schedulableCard(
          profile,
          program,
          navigateToProfile,
          pearson,
          showPearsonTOSDialog,
          pearsonTOSDialogVisible,
          submitPearsonSSO
        )
      default:
        return null
      }
    } else {
      return (
        <Card className="card final-exam-card">
          <CardContent>
            <div className="card-header">
              <div>
                <img className="exam-icon" src="/static/images/exam_icon.png" />
              </div>
              <div className="exam-text">
                <h2>Final Proctored Exam</h2>
                <p>
                  To earn a certificate, you must take an online proctored exam
                  for each course. Before you can take a proctored exam, you
                  have to pay for the course and pass the online work.
                </p>
                <p>
                  Exams will be available online on edX.org. You may take the
                  exam at any time during the exam period. No advance scheduling
                  is required, but you should verify your account and complete
                  the exam onboarding during the one week onboarding period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }
  }
}
