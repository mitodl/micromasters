"""Discussions exceptions"""


class DiscussionSyncException(Exception):
    """Base exception for discussions"""


class DiscussionUserSyncException(DiscussionSyncException):
    """Exception indicating failure to sync discussion user"""


class ChannelCreationException(DiscussionSyncException):
    """Exception which occurs when an error happens on open-discussions when creating a channel"""


class ChannelAlreadyExistsException(ChannelCreationException):
    """Exception which occurs when an error happens on open-discussions when creating a channel that already exists"""


class ContributorSyncException(DiscussionSyncException):
    """Exception indicating failure to add or remove a contributor"""


class SubscriberSyncException(DiscussionSyncException):
    """Exception indicating a failure to add or remove a subscriber"""


class ModeratorSyncException(DiscussionSyncException):
    """Exception indicating a failure to add or remove a moderator"""


class UnableToAuthenticateDiscussionUserException(DiscussionSyncException):
    """Exception indicating we were unable to generate a valid JWT for a DiscussionUser"""
