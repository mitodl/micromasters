// @flow
import React from "react"
import Card from "@material-ui/core/Card"
import Typography from "@material-ui/core/Typography"
import CardContent from "@material-ui/core/CardContent"
import Switch from "@material-ui/core/Switch"
import R from "ramda"
import CircularProgress from "@material-ui/core/CircularProgress"

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
          disableRipple={true}
          onChange={() => toggleEmailActive(automaticEmail)}
        />
        {emailsInFlight.has(automaticEmail.id) ? <CircularProgress /> : null}
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
    <Card shadow={1} className="card email-campaigns-card">
      <CardContent>
        <Typography component="h2">Manage Email Campaigns</Typography>
        {S.either(
          renderEmptyMessage,
          renderEmailRows(toggleEmailActive, emailsInFlight, openEmailComposer),
          getEmails()
        )}
      </CardContent>
    </Card>
  )
}
export default EmailCampaignsCard
