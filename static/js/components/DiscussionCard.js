// @flow
import React from "react"
import { Card } from "react-mdl/lib/Card"
import R from "ramda"
import moment from "moment"

import { channelURL, postURL } from "../lib/discussions"

import type { Post } from "../flow/discussionTypes"

const formatTime = R.compose(date => date.fromNow(), moment, R.prop("created"))

const renderPosts = R.compose(
  R.map(post => (
    <div className="post" key={post.id}>
      <img src={post.profile_image} />
      <div className="title-and-author">
        <a
          target="_blank"
          className="post-title"
          rel="noopener noreferrer"
          href={postURL(post.id, post.channel_name)}
        >
          {post.title}
        </a>
        <div className="time-and-channel">
          {formatTime(post)} in{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={channelURL(post.channel_name)}
          >
            {post.channel_name}
          </a>
        </div>
      </div>
    </div>
  )),
  R.take(5)
)

type DiscussionCardProps = {
  frontpage: Array<Post>
}

const DiscussionCard = (props: DiscussionCardProps) => {
  const { frontpage } = props

  return (
    <Card className="discussion-card" shadow={0}>
      <div className="mdl-card__title header">
        <h2 className="mdl-card__title-text">Discussion</h2>
        <a href="/discussions" target="_blank" rel="noopener noreferrer">
          View All
        </a>
      </div>
      <div className="posts">{renderPosts(frontpage)}</div>
    </Card>
  )
}

export default DiscussionCard
