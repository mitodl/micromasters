"""Discussions exceptions"""


class DiscussionUserSyncException(Exception):
    """Exception indicating failure to sync discussion user"""


class ChannelCreationException(Exception):
    """Exception which occurs when an error happens on open-discussions when creating a channel"""
