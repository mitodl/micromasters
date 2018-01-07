"""
Tests for grades tasks
"""
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.core.cache import caches
from django_redis import get_redis_connection

from courses.factories import CourseRunFactory
from dashboard.factories import CachedEnrollmentFactory, CachedCurrentGradeFactory
from grades import tasks
from grades.api import CACHE_KEY_FAILED_USERS_BASE_STR
from grades.models import (
    CourseRunGradingStatus,
    FinalGrade,
    FinalGradeStatus,
)
from micromasters.factories import UserFactory
from micromasters.utils import now_in_utc
from search.base import MockedESTestCase


cache_redis = caches['redis']

# pylint: disable=protected-access


class GradeTasksTests(MockedESTestCase):
    """
    Tests for final grades tasks
    """

    @classmethod
    def setUpTestData(cls):
        cls.users = [UserFactory.create() for _ in range(35)]

        freeze_date = now_in_utc()-timedelta(days=1)
        future_freeze_date = now_in_utc()+timedelta(days=1)
        cls.course_run1 = CourseRunFactory.create(freeze_grade_date=freeze_date)
        cls.course_run2 = CourseRunFactory.create(freeze_grade_date=freeze_date)
        cls.all_freezable_runs = [cls.course_run1, cls.course_run2]

        cls.course_run_future = CourseRunFactory.create(freeze_grade_date=future_freeze_date)
        cls.course_run_frozen = CourseRunFactory.create(freeze_grade_date=freeze_date)

        CourseRunGradingStatus.objects.create(course_run=cls.course_run_frozen, status=FinalGradeStatus.COMPLETE)

        for user in cls.users:
            CachedEnrollmentFactory.create(user=user, course_run=cls.course_run1)
            CachedCurrentGradeFactory.create(user=user, course_run=cls.course_run1)

    @patch('grades.tasks.freeze_course_run_final_grades', autospec=True)
    def test_find_course_runs_and_freeze_grades(self, mock_freeze):
        """
        Test for the find_course_runs_and_freeze_grades task
        """
        tasks.find_course_runs_and_freeze_grades.delay()

        assert mock_freeze.delay.call_count == len(self.all_freezable_runs)
        for run in self.all_freezable_runs:
            mock_freeze.delay.assert_any_call(run.id)

    @patch('grades.api.freeze_user_final_grade', autospec=True)
    def test_freeze_users_final_grade_async(self, mock_freeze_func):
        """
        Test for the freeze_users_final_grade_async task
        """
        tasks.freeze_users_final_grade_async.delay([user.id for user in self.users], self.course_run1.id)
        assert mock_freeze_func.call_count == len(self.users)
        for user in self.users:
            mock_freeze_func.assert_any_call(user, self.course_run1)

        # even if the function gives errors, it still completes
        mock_freeze_func.reset_mock()
        mock_freeze_func.side_effect = AttributeError

        tasks.freeze_users_final_grade_async.delay([user.id for user in self.users], self.course_run1.id)
        assert mock_freeze_func.call_count == len(self.users)
        for user in self.users:
            mock_freeze_func.assert_any_call(user, self.course_run1)

    def test_freeze_course_run_final_grades_1(self):
        """
        Test for the test_freeze_course_run_final_grades
        task in case it ends because the run cannot be frozen
        """
        tasks.freeze_course_run_final_grades.delay(self.course_run_future.id)
        # in this case there is not even an entry in the Table
        assert CourseRunGradingStatus.objects.filter(course_run=self.course_run_future).exists() is False

    def test_freeze_course_run_final_grades_2(self):
        """
        Test for the test_freeze_course_run_final_grades
        task in case it ends because the run has already been frozen
        """
        tasks.freeze_course_run_final_grades.delay(self.course_run_frozen.id)
        # in this case no task has started
        assert cache_redis.get(tasks.CACHE_ID_BASE_STR.format(self.course_run_frozen.edx_course_key)) is None

    def test_freeze_course_run_final_grades_3(self):
        """
        Test for the test_freeze_course_run_final_grades
        task in case there are no more users to be processed
        """
        run_grade_info_qset = CourseRunGradingStatus.objects.filter(course_run=self.course_run2)
        assert run_grade_info_qset.exists() is False
        tasks.freeze_course_run_final_grades.delay(self.course_run2.id)
        assert run_grade_info_qset.exists() is True
        info_run = run_grade_info_qset.first()
        assert info_run.course_run == self.course_run2
        assert info_run.status == FinalGradeStatus.COMPLETE

    @patch('celery.result.GroupResult.restore', new_callable=MagicMock)
    @patch('grades.api.freeze_user_final_grade', autospec=True, return_value=None)
    def test_freeze_course_run_final_grades_4(self, freeze_single_user, mock_restore):
        """
        Test for the test_freeze_course_run_final_grades
        task in case there are users to be processed

        NOTE: In this test it is mocked a function in a subtask and not the subtask.
        The reason is because mocking subtasks inside celery groups creates problems.
        """
        restore_result = MagicMock()
        restore_result.ready.return_value = True
        mock_restore.return_value = restore_result

        # first call
        run_grade_info_qset = CourseRunGradingStatus.objects.filter(course_run=self.course_run1)
        assert run_grade_info_qset.exists() is False
        tasks.freeze_course_run_final_grades.delay(self.course_run1.id)
        assert run_grade_info_qset.exists() is True
        info_run = run_grade_info_qset.first()
        assert info_run.course_run == self.course_run1
        assert info_run.status == FinalGradeStatus.PENDING
        cache_id = tasks.CACHE_ID_BASE_STR.format(self.course_run1.edx_course_key)
        cached_celery_task_id_1 = cache_redis.get(cache_id)
        assert cached_celery_task_id_1 is not None
        assert freeze_single_user.call_count == len(self.users)
        for user in self.users:
            freeze_single_user.assert_any_call(user, self.course_run1)

        # simulate successful freeze for most users
        successful_users = self.users[5:]
        for user in successful_users:
            FinalGrade.objects.create(
                user=user,
                grade=0.6,
                passed=True,
                course_run=self.course_run1,
                status=FinalGradeStatus.COMPLETE
            )

        # new call will process all the remaining users without changing the status of the course run
        freeze_single_user.reset_mock()
        tasks.freeze_course_run_final_grades.delay(self.course_run1.id)
        info_run.refresh_from_db()
        assert info_run.status == FinalGradeStatus.PENDING
        cached_celery_task_id_2 = cache_redis.get(cache_id)
        assert cached_celery_task_id_2 is not None
        assert cached_celery_task_id_2 != cached_celery_task_id_1
        remaining_users = self.users[:5]
        assert freeze_single_user.call_count == len(remaining_users)
        for user in remaining_users:
            freeze_single_user.assert_any_call(user, self.course_run1)

        # simulate successful freeze for remaining users users
        for user in remaining_users:
            FinalGrade.objects.create(
                user=user,
                grade=0.6,
                passed=True,
                course_run=self.course_run1,
                status=FinalGradeStatus.COMPLETE
            )

        # a new call will just change the status of the course and clean up the cache
        freeze_single_user.reset_mock()
        tasks.freeze_course_run_final_grades.delay(self.course_run1.id)
        info_run.refresh_from_db()
        assert info_run.status == FinalGradeStatus.COMPLETE
        assert cache_redis.get(cache_id) is None
        assert freeze_single_user.call_count == 0

    @patch('celery.result.GroupResult.restore', new_callable=MagicMock)
    @patch('grades.api.freeze_user_final_grade', autospec=True, return_value=None)
    def test_freeze_course_run_final_grades_5(self, freeze_single_user, mock_restore):
        """
        Test for the test_freeze_course_run_final_grades
        task in case there are users that failed authentication
        """
        restore_result = MagicMock()
        restore_result.ready.return_value = True
        mock_restore.return_value = restore_result

        # first call
        run_grade_info_qset = CourseRunGradingStatus.objects.filter(course_run=self.course_run1)
        assert run_grade_info_qset.exists() is False
        tasks.freeze_course_run_final_grades.delay(self.course_run1.id)
        assert run_grade_info_qset.exists() is True
        info_run = run_grade_info_qset.first()
        assert info_run.course_run == self.course_run1
        assert info_run.status == FinalGradeStatus.PENDING
        cache_id = tasks.CACHE_ID_BASE_STR.format(self.course_run1.edx_course_key)
        cached_celery_task_id_1 = cache_redis.get(cache_id)
        assert cached_celery_task_id_1 is not None
        assert freeze_single_user.call_count == len(self.users)
        for user in self.users:
            freeze_single_user.assert_any_call(user, self.course_run1)

        # simulate successful freeze for most users
        successful_users = self.users[5:]
        for user in successful_users:
            FinalGrade.objects.create(
                user=user,
                grade=0.6,
                passed=True,
                course_run=self.course_run1,
                status=FinalGradeStatus.COMPLETE
            )
        failed_users = self.users[:5]
        failed_users_cache_key = CACHE_KEY_FAILED_USERS_BASE_STR.format(self.course_run1.edx_course_key)
        con = get_redis_connection("redis")
        con.delete(failed_users_cache_key)
        for user in failed_users:
            con.lpush(failed_users_cache_key, user.id)

        # second call
        freeze_single_user.reset_mock()
        tasks.freeze_course_run_final_grades.delay(self.course_run1.id)

        # new call will not try to process any failed users and will set status to COMPLETE
        info_run.refresh_from_db()
        assert info_run.status == FinalGradeStatus.COMPLETE
        assert con.llen(failed_users_cache_key) == 0
        assert cache_redis.get(cache_id) is None
        assert freeze_single_user.call_count == 0
