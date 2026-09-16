"""Sentry setup and configuration"""

import re

import sentry_sdk
from celery.exceptions import WorkerLostError
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration

# these errors occur when a shutdown is happening (usually caused by a SIGTERM)
SHUTDOWN_ERRORS = (WorkerLostError, SystemExit)


# Postgres appends a DETAIL line to constraint violations that echoes the whole
# offending row -- on a users table that is the learner's name, email and
# external UUID.  psycopg puts it in str(exc), so it ships inside the exception
# value, where no SDK privacy setting reaches it: send_default_pii governs
# user/cookie/header capture and request_bodies governs request bodies, and
# neither touches exception text.
#
# The newline is matched both raw and as a literal backslash-n: the SDK repr()s
# frame locals and non-string logging params during serialization, so there the
# DETAIL line arrives as "...constraint\\nDETAIL: ..." inside a repr string.
PG_DETAIL_RE = re.compile(r"(\n|\\n)DETAIL:.*", re.DOTALL)


def scrub_pg_detail(text):
    """Truncate a Postgres error string at its DETAIL line.

    Keeps the primary message, which is what identifies the failure, and drops
    the row echo plus any HINT/CONTEXT Postgres appends after it.
    """
    return PG_DETAIL_RE.sub(
        lambda match: match.group(1) + "DETAIL:  [scrubbed]", text, count=1
    )


def scrub_pg_details(event):
    """Truncate Postgres DETAIL lines everywhere in a Sentry event.

    The row echo reaches Sentry through more fields than the exception value:
    LoggingIntegration puts the log message in a breadcrumb
    (_breadcrumb_from_record), logger.error("...: %s", exc) puts it in
    logentry.params (EventHandler._emit), and captured stack-frame locals
    carry it in frame vars because with_locals defaults to True
    (serialize_frame).  Walking the whole event covers those without
    enumerating them, and does not go stale when the SDK adds another.

    Safe to walk naively because Client._prepare_event serializes the event
    before calling before_send, so every leaf here is already a JSON
    primitive -- no live exception objects to coerce.
    """
    return _scrub_node(event)


def _scrub_node(node):
    """Recurse through the serialized event, rewriting strings in place."""
    if isinstance(node, str):
        return scrub_pg_detail(node)
    if isinstance(node, dict):
        for key, value in node.items():
            node[key] = _scrub_node(value)
        return node
    if isinstance(node, list):
        node[:] = [_scrub_node(item) for item in node]
        return node
    return node


def init_sentry(*, dsn, environment, version, log_level):
    """
    Initializes sentry
    Args:
        dsn (str): the sentry DSN key
        environment (str): the application environment
        version (str): the version of the application
        log_level (str): the sentry log level
    """

    def before_send(event, hint):
        """
        Filter or transform events before they're sent to Sentry
        Args:
            event (dict): event object
            hint (dict): event hint, see https://docs.sentry.io/platforms/python/#hints
        Returns:
            dict or None: returns the modified event or None to filter out the event
        """
        if "exc_info" in hint:
            _, exc_value, _ = hint["exc_info"]
            if isinstance(exc_value, SHUTDOWN_ERRORS):
                # we don't want to report shutdown errors to sentry
                return None
        return scrub_pg_details(event)

    sentry_sdk.init(  # pylint: disable=abstract-class-instantiated
        dsn=dsn,
        environment=environment,
        release=version,
        before_send=before_send,
        # Request bodies are NOT gated on send_default_pii: the SDK sets
        # request.data unconditionally (RequestExtractor.extract_into_event)
        # and this is the only control (request_body_within_bounds).  Left
        # unset it defaults to "medium", i.e. 10,000-byte bodies.  Here that
        # covers every request Django serves, including Wagtail page-editor
        # POSTs.  Set explicitly so the choice is findable here rather than in
        # a dependency's defaults.
        #
        # Spelled `request_bodies` because this app is pinned to sentry-sdk
        # 1.9.0; the option was renamed `max_request_body_size` in 2.x, which is
        # what every other application in the estate passes.  init validates its
        # kwargs strictly, so the 2.x spelling raises TypeError here rather than
        # being ignored.  Rename this when the pin moves.
        request_bodies="small",
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
            LoggingIntegration(level=log_level),
        ],
    )
