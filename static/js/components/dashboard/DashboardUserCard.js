// @flow
import React from "react"
import { Card, CardTitle, CardText } from "react-mdl/lib/Card"
import Link from "react-router/lib/Link"

import ProfileImage from "../../containers/ProfileImage"
import { getPreferredName } from "../../util/util"
import type { Profile } from "../../flow/profileTypes"
import type { Program } from "../../flow/programTypes"

export default class DashboardUserCard extends React.Component {
  props: {
    profile: Profile,
    program: Program
  }

  render() {
    const { profile, program } = this.props
    let programTitle = program ? program.title : ""

    return (
      <Card className="dashboard-user-card" shadow={0}>
        <div className="dashboard-user-card-image">
          <ProfileImage profile={profile} editable={true} />
        </div>
        <div className="dashboard-user-card-text">
          <CardTitle>{getPreferredName(profile)}</CardTitle>
          <CardText>
            <span className="dashboard-user-card-text-program">
              {programTitle}
            </span>

            <Link
              to={`/learner/${profile.username}`}
              className="mm-minor-action"
            >
              View Profile
            </Link>
          </CardText>
        </div>
      </Card>
    )
  }
}
