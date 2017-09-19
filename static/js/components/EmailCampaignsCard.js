// @flow
import React from "react"
import { Card, CardTitle } from "react-mdl/lib/Card"
import Switch from "react-mdl/lib/Switch"
import R from "ramda"
import Spinner from "react-mdl/lib/Spinner"

import type { AutomaticEmail } from "../flow/emailTypes"
import type { Either } from "../flow/sanctuaryTypes"
import { S } from "../lib/sanctuary"

const renderEmptyMessage = msg => <div className="empty-message">{msg}</div>

const wrapEmailRows = rows => (
  <div className="automatic-email-rows">
    <div className="header">
      <div>Email name / subject</div>
      <div>Start date</div>
      <div>Stop date</div>
      <div>Active</div>
    </div>
    {rows}
  </div>
)

const renderEmailRow = R.curry(
  (
    toggleEmailActive,
    emailsInFlight,
    openEmailComposer,
    automaticEmail,
    idx
  ) => (
    <div className="email-row" key={idx}>
      <div>{automaticEmail.email_subject}</div>
      <div>--</div>
      <div>--</div>
      <div>
        <Switch
          checked={automaticEmail.enabled}
          ripple={false}
          onChange={() => toggleEmailActive(automaticEmail)}
        />
        {emailsInFlight.has(automaticEmail.id) ? <Spinner singleColor /> : null}
        <a onClick={() => openEmailComposer(automaticEmail)}>Edit</a>
      </div>
    </div>
  )
)

const renderEmailRows = (
  toggleEmailActive,
  emailsInFlight,
  openEmailComposer
) =>
  R.compose(
    wrapEmailRows,
    R.addIndex(R.map)(
      renderEmailRow(toggleEmailActive, emailsInFlight, openEmailComposer)
    )
  )

type CampaignCardProps = {
  getEmails: () => Either<React$Element<string>, Array<AutomaticEmail>>,
  emailsInFlight: Set<number>,
  toggleEmailActive: (e: AutomaticEmail) => void,
  openEmailComposer: (e: AutomaticEmail) => void
}

const EmailCampaignsCard = (props: CampaignCardProps) => {
  const {
    getEmails,
    toggleEmailActive,
    emailsInFlight,
    openEmailComposer
  } = props

  return (
    <Card shadow={1} className="email-campaigns-card">
      <CardTitle>Manage Email Campaigns</CardTitle>
      {S.either(
        renderEmptyMessage,
        renderEmailRows(toggleEmailActive, emailsInFlight, openEmailComposer),
        getEmails()
      )}
    </Card>
  )
}
export default EmailCampaignsCard
