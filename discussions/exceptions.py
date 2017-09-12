"""Discussions exceptions"""


class DiscussionUserSyncException(Exception):
    """Exception indicating failure to sync discussion user"""


class ChannelCreationException(Exception):
    """Exception which occurs when an error happens on open-discussions when creating a channel"""


class ContributorSyncException(Exception):
    """Exception indicating failure to add or remove a contributor"""


class SubscriberSyncException(Exception):
    """Exception indicating a failure to add or remove a subscriber"""


class ModeratorSyncException(Exception):
    """Exception indicating a failure to add or remove a moderator"""
