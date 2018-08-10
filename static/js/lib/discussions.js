// @flow
/* global SETTINGS: false */
import urljoin from "url-join"

// utility functions for interacting with open-discussions

export const channelURL = (channelName: string) =>
  urljoin(SETTINGS.open_discussions_base_url, "channel", channelName)

export const postURL = (postID: string, channelName: string) =>
  urljoin(SETTINGS.open_discussions_base_url, "channel", channelName, postID)

export const frontpageAPI = () =>
  urljoin(SETTINGS.open_discussions_base_url, "api/v0/frontpage/")
