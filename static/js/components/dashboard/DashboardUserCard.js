// @flow
import React from "react"
import Card from "@material-ui/core/Card"
import Link from "react-router/lib/Link"

import ProfileImage from "../../containers/ProfileImage"
import { getPreferredName } from "../../util/util"
import type { Profile } from "../../flow/profileTypes"
import type { Program } from "../../flow/programTypes"
import Typography from "@material-ui/core/Typography"
import CardContent from "@material-ui/core/CardContent"

export default class DashboardUserCard extends React.Component {
  props: {
    profile: Profile,
    program: Program
  }

  render() {
    const { profile, program } = this.props
    const programTitle = program ? program.title : ""

    return (
      <Card className="card" shadow={0}>
        <CardContent className="dashboard-user-card">
          <div className="dashboard-user-card-image">
            <ProfileImage profile={profile} editable={true} />
          </div>
          <div className="dashboard-user-card-text">
            <Typography component="h2">{getPreferredName(profile)}</Typography>
            <Typography component="p">
              <span className="dashboard-user-card-text-program">
                {programTitle}
              </span>

              <Link
                to={`/learner/${profile.username}`}
                className="mm-minor-action"
              >
                View Profile
              </Link>
            </Typography>
          </div>
        </CardContent>
      </Card>
    )
  }
}
