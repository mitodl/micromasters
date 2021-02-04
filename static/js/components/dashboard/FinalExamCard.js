// @flow
/* global SETTINGS: false */
import React from "react"
import Card from "@material-ui/core/Card"
import CardContent from "@material-ui/core/CardContent"

import type { Profile } from "../../flow/profileTypes"
import type { Program } from "../../flow/programTypes"
import type { UIState } from "../../reducers/ui"

type Props = {
  profile: Profile,
  program: Program,
  ui: UIState,
}

export default class FinalExamCard extends React.Component<void, Props, void> {
  render() {
    return (
      <Card className="card final-exam-card">
        <CardContent>
          <div className="card-header">
            <div>
              <img className="exam-icon" src="/static/images/exam_icon.png"/>
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
