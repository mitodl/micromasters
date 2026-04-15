"""Tests for courses tasks."""

from unittest.mock import patch

from courses.factories import CourseFactory
from courses.mit_learn_api import MITLearnAPIError
from courses.tasks import sync_course_run_info_from_learn
from search.base import MockedESTestCase


class CourseTasksTests(MockedESTestCase):
    """Tests for the MIT Learn sync task."""

    @patch("courses.tasks.sync_mit_learn_courseruns_for_course", autospec=True)
    @patch("courses.tasks.fetch_course_from_mit_learn", autospec=True)
    def test_sync_course_run_info_from_learn_skips_blank_keys_and_empty_payloads(
        self,
        mock_fetch_course,
        mock_sync_course_runs,
    ):
        """Courses without keys or payloads should be skipped."""
        CourseFactory.create(edx_key="")
        empty_payload_course = CourseFactory.create(edx_key="course-empty")
        syncable_course = CourseFactory.create(edx_key="course-sync")
        raw_course = {"runs": []}

        mock_fetch_course.side_effect = lambda course_id: {
            empty_payload_course.edx_key: {},
            syncable_course.edx_key: raw_course,
        }[course_id]

        sync_course_run_info_from_learn()

        assert mock_fetch_course.call_count == 2
        mock_fetch_course.assert_any_call(empty_payload_course.edx_key)
        mock_fetch_course.assert_any_call(syncable_course.edx_key)
        mock_sync_course_runs.assert_called_once_with(syncable_course, raw_course)

    @patch("courses.tasks.sync_mit_learn_courseruns_for_course", autospec=True)
    @patch("courses.tasks.fetch_course_from_mit_learn", autospec=True)
    def test_sync_course_run_info_from_learn_logs_errors_and_continues(
        self,
        mock_fetch_course,
        mock_sync_course_runs,
    ):
        """MIT Learn API errors should be logged without stopping later courses."""
        failing_course = CourseFactory.create(edx_key="course-fail")
        successful_course = CourseFactory.create(edx_key="course-success")
        raw_course = {"runs": []}

        def fetch_side_effect(course_id):
            if course_id == failing_course.edx_key:
                raise MITLearnAPIError("boom")
            if course_id == successful_course.edx_key:
                return raw_course
            raise AssertionError(f"Unexpected course id: {course_id}")

        mock_fetch_course.side_effect = fetch_side_effect

        with self.assertLogs("courses.tasks", level="ERROR") as logs:
            sync_course_run_info_from_learn()

        assert mock_fetch_course.call_count == 2
        mock_fetch_course.assert_any_call(failing_course.edx_key)
        mock_fetch_course.assert_any_call(successful_course.edx_key)
        mock_sync_course_runs.assert_called_once_with(successful_course, raw_course)
        assert len(logs.output) == 1
        assert logs.output[0].startswith(
            'ERROR:courses.tasks:Error syncing MIT Learn course data for course "course-fail"'
        )
