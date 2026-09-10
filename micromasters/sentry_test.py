"""Tests for Sentry event scrubbing."""

# pylint: disable=redefined-outer-name
import json
import logging

import pytest
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.transport import Transport

from micromasters.sentry import scrub_pg_detail, scrub_pg_details

# A real MITXONLINE-6PK exception value, with the learner identifiers replaced.
PG_INTEGRITY_ERROR = (
    'null value in column "name" of relation "users_user" violates not-null '
    "constraint\n"
    "DETAIL:  Failing row contains (1863408, , 2026-08-07 18:38:14.503726+00, f, "
    "learner@example.invalid, learner@example.invalid, null, f, t, "
    "12d7dfc5-6f84-46db-9383-2d7079434173, 1863408, learner@example.invalid, f)."
)
PG_PRIMARY_MESSAGE = (
    'null value in column "name" of relation "users_user" violates not-null constraint'
)


class FakeTransport(Transport):
    """Collect outgoing events instead of sending them."""

    def __init__(self):
        super().__init__()
        self.events = []

    def capture_event(self, event):
        self.events.append(event)


@pytest.fixture
def sentry_transport():
    """Initialize the real SDK with the scrub, and detach it afterwards."""
    transport = FakeTransport()
    sentry_sdk.init(
        dsn="https://k@o0.ingest.sentry.io/0",
        transport=transport,
        before_send=lambda event, hint: scrub_pg_details(event),
        default_integrations=False,
        integrations=[
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR)
        ],
    )
    yield transport
    sentry_sdk.Hub.current.bind_client(None)


def test_detail_line_is_truncated():
    """The row echo goes; the primary error that names the failure stays."""
    scrubbed = scrub_pg_detail(PG_INTEGRITY_ERROR)
    assert scrubbed.startswith(PG_PRIMARY_MESSAGE)
    assert "learner@example.invalid" not in scrubbed
    assert "12d7dfc5-6f84-46db-9383-2d7079434173" not in scrubbed


def test_escaped_detail_line_is_truncated():
    """repr() turns the newline into a literal backslash-n; that form goes too."""
    scrubbed = scrub_pg_detail(repr(Exception(PG_INTEGRITY_ERROR)))
    assert PG_PRIMARY_MESSAGE in scrubbed
    assert "learner@example.invalid" not in scrubbed


def test_message_without_detail_is_unchanged():
    """A message with no DETAIL line passes through untouched."""
    message = "connection to server failed"
    assert scrub_pg_detail(message) == message


def test_hint_and_context_after_detail_are_dropped():
    """HINT and CONTEXT follow DETAIL and can quote row data too."""
    text = "boom\nDETAIL:  row data\nHINT:  try again\nCONTEXT:  SQL statement"
    scrubbed = scrub_pg_detail(text)
    assert "row data" not in scrubbed
    assert "try again" not in scrubbed
    assert "SQL statement" not in scrubbed


def test_scrubs_exception_values_logentry_and_message():
    """Every place the SDK can put an error string is covered."""
    event = {
        "exception": {"values": [{"value": PG_INTEGRITY_ERROR}]},
        "logentry": {
            "message": PG_INTEGRITY_ERROR,
            "formatted": PG_INTEGRITY_ERROR,
        },
        "message": PG_INTEGRITY_ERROR,
    }
    scrub_pg_details(event)
    assert "learner@example.invalid" not in repr(event)


def test_scrubs_breadcrumb_messages():
    """LoggingIntegration records the log message as a breadcrumb."""
    event = {
        "breadcrumbs": {
            "values": [
                {
                    "type": "log",
                    "category": "django_scim.views",
                    "message": PG_INTEGRITY_ERROR,
                }
            ]
        }
    }
    scrub_pg_details(event)
    assert "learner@example.invalid" not in repr(event)


def test_scrubs_logentry_params():
    """logger.error("...: %s", exc) puts the repr'd exception in logentry.params."""
    event = {
        "logentry": {
            "message": "Unable to complete SCIM call: %s",
            "formatted": "Unable to complete SCIM call: " + PG_INTEGRITY_ERROR,
            "params": [repr(Exception(PG_INTEGRITY_ERROR))],
        }
    }
    scrub_pg_details(event)
    assert "learner@example.invalid" not in repr(event)


def test_scrubs_captured_frame_locals():
    """with_locals defaults to True, so repr'd frame vars carry it."""
    event = {
        "exception": {
            "values": [
                {
                    "value": "boom",
                    "stacktrace": {
                        "frames": [
                            {
                                "function": "save",
                                "vars": {
                                    "exc": repr(Exception(PG_INTEGRITY_ERROR)),
                                    "retries": 3,
                                },
                            }
                        ]
                    },
                }
            ]
        }
    }
    scrub_pg_details(event)
    assert "learner@example.invalid" not in repr(event)
    frame = event["exception"]["values"][0]["stacktrace"]["frames"][0]
    assert frame["vars"]["retries"] == 3


def test_walk_preserves_non_string_leaves():
    """The walk must not coerce timestamps, ints or None into strings."""
    event = {
        "timestamp": 1757345533.179,
        "level": "error",
        "extra": {"count": 42, "missing": None, "flag": True},
        "message": PG_INTEGRITY_ERROR,
    }
    scrub_pg_details(event)
    assert event["timestamp"] == 1757345533.179
    assert event["extra"] == {"count": 42, "missing": None, "flag": True}
    assert "learner@example.invalid" not in event["message"]


def test_real_sdk_scrubs_params_and_local_variables(sentry_transport):
    """Go through the real SDK, which repr()s params and locals before before_send."""

    def save():
        exc = Exception(PG_INTEGRITY_ERROR)
        raise exc

    try:
        save()
    except Exception as e:  # pylint: disable=broad-except
        logging.getLogger("x").error("Unable to save: %s", e)
        sentry_sdk.capture_exception(e)
    sentry_sdk.flush()

    assert len(sentry_transport.events) == 2
    for event in sentry_transport.events:
        assert "learner@example.invalid" not in json.dumps(event)
