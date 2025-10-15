// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"

import DiscussionCard from "./DiscussionCard"

import { channelURL, postURL } from "../lib/discussions"
import { makeFrontPageList } from "../factories/posts"

describe("DiscussionCard", () => {
  let postList

  beforeEach(() => {
    postList = makeFrontPageList()
  })

  const renderCard = () => mount(<DiscussionCard frontpage={postList} />)

  it("should render the first 5 posts only", () => {
    const wrapper = renderCard()
    assert.lengthOf(wrapper.find(".post"), 5)
  })

  it("should show information from and links to posts", () => {
    const wrapper = renderCard()
    const postDisplay = wrapper.find(".post").at(0)
    const [post] = postList

    assert.equal(postDisplay.find("img").props().src, post.profile_image)

    assert.equal(
      postDisplay.find("a").at(0).props().href,
      postURL(post.id, post.channel_name)
    )

    assert.equal(postDisplay.find("a").at(0).text(), post.title)
  })

  it("should link to the original channel", () => {
    const wrapper = renderCard()
    const postDisplay = wrapper.find(".post").at(0)
    const [post] = postList

    assert.equal(
      postDisplay.find("a").at(1).props().href,
      channelURL(post.channel_name)
    )

    assert.equal(postDisplay.find("a").at(1).text(), post.channel_name)
  })

  it("should link to open discussions", () => {
    const wrapper = renderCard()
    assert.equal(wrapper.find("a").at(0).props().href, "/discussions")
  })
})
