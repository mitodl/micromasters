"""Tests for MIT Learn API integration helpers."""

from backends.constants import BACKEND_EDX_ORG, BACKEND_MITX_ONLINE
from courses.factories import CourseFactory
from courses.mit_learn_api import get_courseware_backend, sync_mit_learn_courseruns_for_course
from courses.models import CourseRun
from search.base import MockedESTestCase


class MITLearnAPITests(MockedESTestCase):
    """Tests for syncing MIT Learn course run payloads."""

    def test_get_courseware_backend_maps_known_platform_codes(self):
        """Known platform codes should map to the expected backend."""
        assert get_courseware_backend("edx", "MITx+1") == BACKEND_EDX_ORG
        assert get_courseware_backend(" EDXORG ", "MITx+1") == BACKEND_EDX_ORG
        assert get_courseware_backend("mitxonline", "MITx+1") == BACKEND_MITX_ONLINE

    def test_get_courseware_backend_warns_and_falls_back_for_unknown_codes(self):
        """Missing or unexpected platform codes should warn and use the safe default."""
        with self.assertLogs("courses.mit_learn_api", level="WARNING") as logs:
            missing_backend = get_courseware_backend(None, "MITx+2")
            unexpected_backend = get_courseware_backend("FutureX", "MITx+2")

        assert missing_backend == BACKEND_MITX_ONLINE
        assert unexpected_backend == BACKEND_MITX_ONLINE
        assert logs.output == [
            "WARNING:courses.mit_learn_api:MIT Learn payload for course MITx+2 is missing "
            "platform.code; defaulting courseware_backend to mitxonline",
            "WARNING:courses.mit_learn_api:MIT Learn payload for course MITx+2 returned unexpected "
            "platform.code='FutureX'; defaulting courseware_backend to mitxonline",
        ]

    def test_sync_mit_learn_courseruns_skips_missing_run_id(self):
        """A run without run_id should be logged and skipped."""
        course = CourseFactory.create(edx_key="MITx+1")
        raw_course = {
            "platform": {"code": "edx"},
            "runs": [
                {
                    "title": "Run without id",
                    "url": "https://example.com/run-without-id",
                }
            ],
        }

        with self.assertLogs("courses.mit_learn_api", level="ERROR") as logs:
            num_created = sync_mit_learn_courseruns_for_course(course, raw_course)

        assert num_created == 0
        assert not CourseRun.objects.filter(course=course).exists()
        assert logs.output == [
            "ERROR:courses.mit_learn_api:Skipping MIT Learn course run for course MITx+1: "
            "missing run_id (title=Run without id)"
        ]

    def test_sync_mit_learn_courseruns_continues_after_missing_run_id(self):
        """A malformed run should not prevent later valid runs from syncing."""
        course = CourseFactory.create(edx_key="MITx+2", title="Course Title")
        raw_course = {
            "platform": {"code": "edx"},
            "runs": [
                {
                    "title": "Missing id",
                    "url": "https://example.com/missing-id",
                },
                {
                    "run_id": "course-v1:MITx+2+1T2026",
                    "title": "Valid run",
                    "url": "https://example.com/valid-run",
                },
            ],
        }

        with self.assertLogs("courses.mit_learn_api", level="ERROR") as logs:
            num_created = sync_mit_learn_courseruns_for_course(course, raw_course)

        assert num_created == 1
        course_run = CourseRun.objects.get(course=course)
        assert course_run.edx_course_key == "course-v1:MITx+2+1T2026"
        assert course_run.title == "Valid run"
        assert course_run.courseware_backend == "edxorg"
        assert logs.output == [
            "ERROR:courses.mit_learn_api:Skipping MIT Learn course run for course MITx+2: "
            "missing run_id (title=Missing id)"
        ]

    def test_sync_mit_learn_courseruns_accepts_edxorg_alias_case_insensitively(self):
        """edX platform aliases should map to the edxorg backend regardless of case."""
        course = CourseFactory.create(edx_key="MITx+3")
        raw_course = {
            "platform": {"code": "EDXORG"},
            "runs": [
                {
                    "run_id": "course-v1:MITx+3+1T2026",
                    "title": "Valid run",
                    "url": "https://example.com/valid-run",
                }
            ],
        }

        num_created = sync_mit_learn_courseruns_for_course(course, raw_course)

        assert num_created == 1
        course_run = CourseRun.objects.get(course=course)
        assert course_run.courseware_backend == "edxorg"

    def test_sync_mit_learn_courseruns_warns_on_missing_platform_code(self):
        """Missing platform.code should warn and fall back safely."""
        course = CourseFactory.create(edx_key="MITx+4")
        raw_course = {
            "runs": [
                {
                    "run_id": "course-v1:MITx+4+1T2026",
                    "title": "Valid run",
                    "url": "https://example.com/valid-run",
                }
            ],
        }

        with self.assertLogs("courses.mit_learn_api", level="WARNING") as logs:
            num_created = sync_mit_learn_courseruns_for_course(course, raw_course)

        assert num_created == 1
        course_run = CourseRun.objects.get(course=course)
        assert course_run.courseware_backend == "mitxonline"
        assert logs.output == [
            "WARNING:courses.mit_learn_api:MIT Learn payload for course MITx+4 is missing "
            "platform.code; defaulting courseware_backend to mitxonline"
        ]

    def test_sync_mit_learn_courseruns_warns_on_unexpected_platform_code(self):
        """Unexpected platform.code values should warn and fall back safely."""
        course = CourseFactory.create(edx_key="MITx+5")
        raw_course = {
            "platform": {"code": "FutureX"},
            "runs": [
                {
                    "run_id": "course-v1:MITx+5+1T2026",
                    "title": "Valid run",
                    "url": "https://example.com/valid-run",
                }
            ],
        }

        with self.assertLogs("courses.mit_learn_api", level="WARNING") as logs:
            num_created = sync_mit_learn_courseruns_for_course(course, raw_course)

        assert num_created == 1
        course_run = CourseRun.objects.get(course=course)
        assert course_run.courseware_backend == "mitxonline"
        assert logs.output == [
            "WARNING:courses.mit_learn_api:MIT Learn payload for course MITx+5 returned unexpected "
            "platform.code='FutureX'; defaulting courseware_backend to mitxonline"
        ]
