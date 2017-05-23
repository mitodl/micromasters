"""
Tests for grades API
"""
from datetime import timedelta
from unittest.mock import patch, MagicMock

import ddt
from django.core.exceptions import ImproperlyConfigured

from backends.edxorg import EdxOrgOAuth2
from courses.factories import CourseRunFactory
from dashboard.api_edx_cache import CachedEdxUserData, UserCachedRunData
from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from financialaid.constants import FinancialAidStatus
from financialaid.factories import (
    FinancialAidFactory,
    TierProgramFactory
)
from grades import api
from grades.exceptions import FreezeGradeFailedException
from grades.models import FinalGrade, FinalGradeStatus
from micromasters.factories import UserFactory
from micromasters.utils import now_in_utc
from search.base import MockedESTestCase


# pylint: disable=protected-access


@ddt.ddt
class GradeAPITests(MockedESTestCase):
    """
    Tests for final grades api
    """

    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory.create()
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.user.username),
            extra_data={"access_token": "fooooootoken"}
        )

        cls.run_fa = CourseRunFactory.create(
            freeze_grade_date=now_in_utc()-timedelta(days=1),
            course__program__financial_aid_availability=True,
        )
        cls.run_fa_with_cert = CourseRunFactory.create(
            freeze_grade_date=None,
            course__program=cls.run_fa.course.program,
        )

        cls.run_no_fa = CourseRunFactory.create(
            freeze_grade_date=now_in_utc()+timedelta(days=1),
            course__program__financial_aid_availability=False,
        )
        cls.run_no_fa_with_cert = CourseRunFactory.create(
            course__program=cls.run_no_fa.course.program,
        )

        all_course_runs = (cls.run_fa, cls.run_fa_with_cert, cls.run_no_fa, cls.run_no_fa_with_cert, )

        for run in all_course_runs:
            if run.course.program.financial_aid_availability:
                FinancialAidFactory.create(
                    user=cls.user,
                    tier_program=TierProgramFactory.create(
                        program=run.course.program, income_threshold=0, current=True
                    ),
                    status=FinancialAidStatus.RESET,
                )

        cls.enrollments = {
            course_run.edx_course_key: CachedEnrollmentFactory.create(
                user=cls.user, course_run=course_run) for course_run in all_course_runs
        }

        cls.current_grades = {
            course_run.edx_course_key: CachedCurrentGradeFactory.create(
                user=cls.user, course_run=course_run) for course_run in all_course_runs
        }

        cls.certificates = {
            course_run.edx_course_key: CachedCertificateFactory.create(
                user=cls.user, course_run=course_run) for course_run in (cls.run_fa_with_cert, cls.run_no_fa_with_cert)
        }

        cls.user_edx_data = CachedEdxUserData(cls.user)

    def test_compute_grade_for_fa(self):
        """
        Tests for _compute_grade_for_fa function.
        This tests that, if present, a certificate is considered before the current grade.
        """
        run1_data = self.user_edx_data.get_run_data(self.run_fa.edx_course_key)
        run2_data = self.user_edx_data.get_run_data(self.run_fa_with_cert.edx_course_key)

        grade1_from_cur_grade = api._compute_grade_for_fa(run1_data)
        grade2_from_cert = api._compute_grade_for_fa(run2_data)

        assert isinstance(grade1_from_cur_grade, api.UserFinalGrade)
        assert isinstance(grade2_from_cert, api.UserFinalGrade)

        assert grade1_from_cur_grade.passed == self.current_grades.get(
            self.run_fa.edx_course_key).data.get('passed')
        assert grade1_from_cur_grade.grade == self.current_grades.get(
            self.run_fa.edx_course_key).data.get('percent')
        assert grade1_from_cur_grade.payed_on_edx is False

        assert grade2_from_cert.passed is True
        assert grade2_from_cert.grade == self.certificates.get(
            self.run_fa_with_cert.edx_course_key).data.get('grade')
        # this is True as long as the certificate is verified
        assert grade2_from_cert.payed_on_edx is True

    @ddt.data(
        ("verified", "downloadable", True, True),
        ("honor", "downloadable", True, True),
        ("audit", "downloadable", True, False),
        ("verified", "generating", False, True),
        ("honor", "generating", False, True),
        ("verified", "notpassing", False, True),
        ("honor", "notpassing", False, True),
        ("verified", "unverified", False, True),
        ("honor", "unverified", False, True),
    )
    @ddt.unpack
    def test_compute_grade_for_fa_certs(self, certificate_type, status, grade_result, payed_edx_result):
        """
        Tests for _compute_grade_for_fa function with certificates of different status
        """
        course_key = self.run_fa_with_cert.edx_course_key
        certificate = self.certificates[course_key]
        certificate.data.update(certificate_type=certificate_type, status=status)
        certificate.save()

        run_data = CachedEdxUserData(self.user).get_run_data(course_key)
        grade = api._compute_grade_for_fa(run_data)
        assert grade.passed is grade_result
        assert grade.grade == self.certificates.get(course_key).data.get('grade')
        assert grade.payed_on_edx == payed_edx_result

    def test_compute_grade_for_non_fa(self):
        """
        Tests for _compute_grade_for_non_fa function.
        This tests that only the existence of a certificate turns in a passed course.
        """
        run3_data = self.user_edx_data.get_run_data(self.run_no_fa.edx_course_key)
        run4_data = self.user_edx_data.get_run_data(self.run_no_fa_with_cert.edx_course_key)

        grade3_from_cur_grade = api._compute_grade_for_non_fa(run3_data)
        grade4_from_cert = api._compute_grade_for_non_fa(run4_data)

        assert isinstance(grade3_from_cur_grade, api.UserFinalGrade)
        assert isinstance(grade4_from_cert, api.UserFinalGrade)

        assert grade3_from_cur_grade.passed is False
        assert grade3_from_cur_grade.grade == self.current_grades.get(
            self.run_no_fa.edx_course_key).data.get('percent')
        # this is true if the enrollment is verified
        assert grade3_from_cur_grade.payed_on_edx is True
        assert grade4_from_cert.passed is True
        assert grade4_from_cert.grade == self.certificates.get(
            self.run_no_fa_with_cert.edx_course_key).data.get('grade')
        # this is True as long as the certificate is verified
        assert grade4_from_cert.payed_on_edx is True

    def test_compute_grade_for_non_fa_enrollment_not_verified(self):
        """
        Tests for _compute_grade_for_non_fa function
        in case there is no certificate and the enrollment is not verified
        """
        course_key = self.run_no_fa.edx_course_key
        enrollment = self.enrollments.get(course_key)
        enrollment.data['mode'] = 'audit'
        enrollment.save()
        run3_data = CachedEdxUserData(self.user).get_run_data(course_key)
        grade3_from_cur_grade = api._compute_grade_for_non_fa(run3_data)
        assert grade3_from_cur_grade.passed is False
        assert grade3_from_cur_grade.grade == self.current_grades.get(
            self.run_no_fa.edx_course_key).data.get('percent')
        assert grade3_from_cur_grade.payed_on_edx is False

    @ddt.data(
        ("verified", "downloadable", True, True),
        ("honor", "downloadable", True, True),
        ("audit", "downloadable", True, False),
        ("verified", "generating", False, True),
        ("honor", "generating", False, True),
        ("verified", "notpassing", False, True),
        ("honor", "notpassing", False, True),
        ("verified", "unverified", False, True),
        ("honor", "unverified", False, True),
    )
    @ddt.unpack
    def test_compute_grade_for_non_fa_certs(self, certificate_type, status, grade_result, payed_edx_result):
        """
        Tests for _compute_grade_for_non_fa function with certificates of different status
        """
        course_key = self.run_no_fa_with_cert.edx_course_key
        certificate = self.certificates[course_key]
        certificate.data.update(certificate_type=certificate_type, status=status)
        certificate.save()

        run_data = CachedEdxUserData(self.user).get_run_data(course_key)
        grade = api._compute_grade_for_non_fa(run_data)
        assert grade.passed is grade_result
        assert grade.grade == self.certificates.get(course_key).data.get('grade')
        assert grade.payed_on_edx is payed_edx_result

    def test_get_compute_func(self):
        """
        tests for _get_compute_func function
        """
        assert api._get_compute_func(self.run_fa) == api._compute_grade_for_fa
        assert api._get_compute_func(self.run_no_fa) == api._compute_grade_for_non_fa

    @patch('grades.api._compute_grade_for_non_fa', autospec=True)
    @patch('grades.api._compute_grade_for_fa', autospec=True)
    def test_get_final_grade(self, fa, non_fa):
        """
        Tests for get_final_grade function.
        What this tests does is just verifying that the right functions are called
        for both financial and not financial aid runs.
        """
        fa.return_value = 0.7
        non_fa.return_value = 0.53

        # run the test just with only one fa and one not fa course runs

        assert api.get_final_grade(self.user, self.run_fa) == 0.7
        assert fa.called is True
        assert fa.call_count == 1
        call_arg = fa.call_args_list[0][0][0]
        assert isinstance(call_arg, UserCachedRunData)
        assert call_arg.edx_course_key == self.run_fa.edx_course_key
        assert non_fa.called is False

        fa.reset_mock()

        assert api.get_final_grade(self.user, self.run_no_fa) == 0.53
        assert non_fa.called is True
        assert non_fa.call_count == 1
        call_arg = non_fa.call_args_list[0][0][0]
        assert isinstance(call_arg, UserCachedRunData)
        assert call_arg.edx_course_key == self.run_no_fa.edx_course_key
        assert fa.called is False

    def test_get_users_without_frozen_final_grade(self):
        """
        tests for get_users_without_frozen_final_grade function
        """
        assert [user.pk for user in api.get_users_without_frozen_final_grade(self.run_fa)] == [self.user.pk]

        # create another user and enrollment
        other_user = UserFactory.create()
        CachedEnrollmentFactory.create(user=other_user, course_run=self.run_fa)
        assert sorted(
            [user.pk for user in api.get_users_without_frozen_final_grade(self.run_fa)]
        ) == sorted([self.user.pk, other_user.pk])

        # add the user to the FinalGrade model as in progress
        fg_status = FinalGrade.objects.create(
            user=other_user, course_run=self.run_fa, status=FinalGradeStatus.PENDING, grade=0.0)
        assert sorted(
            [user.pk for user in api.get_users_without_frozen_final_grade(self.run_fa)]
        ) == sorted([self.user.pk, other_user.pk])

        # change the final grade status to complete
        fg_status.status = FinalGradeStatus.COMPLETE
        fg_status.save()
        assert [user.pk for user in api.get_users_without_frozen_final_grade(self.run_fa)] == [self.user.pk]

    @patch('grades.api.get_final_grade', autospec=True)
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_all_cached_grade_data', new_callable=MagicMock)
    @ddt.data(True, False)
    def test_freeze_user_final_grade_error1(self, raise_on_exception, mock_refr, mock_get_fg):
        """
        Test for freeze_user_final_grade function in case of problems with can_freeze_grades
        """
        # case not ready to be frozen because the freeze date is in the future
        if not raise_on_exception:
            final_grade = api.freeze_user_final_grade(
                self.user, self.run_no_fa, raise_on_exception=raise_on_exception)
            assert final_grade is None
        else:
            with self.assertRaises(FreezeGradeFailedException):
                api.freeze_user_final_grade(
                    self.user, self.run_no_fa, raise_on_exception=raise_on_exception)
        assert mock_refr.called is False
        assert mock_get_fg.called is False
        assert FinalGrade.objects.filter(user=self.user, course_run=self.run_no_fa).exists() is False

    @patch('grades.api.get_final_grade', autospec=True)
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_all_cached_grade_data', new_callable=MagicMock)
    @ddt.data(True, False)
    def test_freeze_user_final_grade_error1_improperly_configured(self, raise_on_exception, mock_refr, mock_get_fg):
        """
        Test for freeze_user_final_grade function in case of problems with can_freeze_grades
        """
        # case without freeze date
        with self.assertRaises(ImproperlyConfigured):
            api.freeze_user_final_grade(self.user, self.run_fa_with_cert, raise_on_exception=raise_on_exception)
        assert mock_refr.called is False
        assert mock_get_fg.called is False
        assert FinalGrade.objects.filter(user=self.user, course_run=self.run_fa_with_cert).exists() is False

    @patch('grades.api.get_final_grade', autospec=True)
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_all_cached_grade_data', new_callable=MagicMock)
    @ddt.data(True, False)
    def test_freeze_user_final_grade_error2(self, raise_on_exception, mock_refr, mock_get_fg):
        """
        Test for freeze_user_final_grade function in case of problems with refresh of cache
        """
        mock_refr.side_effect = AttributeError
        if not raise_on_exception:
            final_grade = api.freeze_user_final_grade(self.user, self.run_fa, raise_on_exception=raise_on_exception)
            assert final_grade is None
        else:
            with self.assertRaises(FreezeGradeFailedException):
                api.freeze_user_final_grade(self.user, self.run_fa, raise_on_exception=raise_on_exception)
        assert mock_get_fg.called is False
        mock_refr.assert_called_once_with(self.user)
        assert FinalGrade.objects.filter(user=self.user, course_run=self.run_fa).exists() is False

    @patch('grades.api.get_final_grade', autospec=True)
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_all_cached_grade_data', new_callable=MagicMock)
    @ddt.data(True, False)
    def test_freeze_user_final_grade_error3(self, raise_on_exception, mock_refr, mock_get_fg):
        """
        Test for freeze_user_final_grade function in case of problems with getting the final grade
        """
        mock_get_fg.side_effect = AttributeError
        if not raise_on_exception:
            final_grade = api.freeze_user_final_grade(self.user, self.run_fa, raise_on_exception=raise_on_exception)
            assert final_grade is None
        else:
            with self.assertRaises(FreezeGradeFailedException):
                api.freeze_user_final_grade(self.user, self.run_fa, raise_on_exception=raise_on_exception)
        mock_refr.assert_called_once_with(self.user)
        mock_get_fg.assert_called_once_with(self.user, self.run_fa)
        assert FinalGrade.objects.filter(user=self.user, course_run=self.run_fa).exists() is False

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_all_cached_grade_data', new_callable=MagicMock)
    def test_freeze_user_final_grade(self, mock_refr):
        """
        Test for happy path for freeze_user_final_grade function
        """
        final_grade = api.freeze_user_final_grade(self.user, self.run_fa)
        assert final_grade is not None
        mock_refr.assert_called_once_with(self.user)
        fg_qset = FinalGrade.objects.filter(user=self.user, course_run=self.run_fa)
        assert fg_qset.exists() is True
        fg_status = fg_qset.first()
        assert fg_status.status == FinalGradeStatus.COMPLETE
        assert fg_status.user == self.user
        assert fg_status.course_run == self.run_fa
        assert fg_status.grade == final_grade.grade
        assert fg_status.passed == final_grade.passed

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_all_cached_grade_data', new_callable=MagicMock)
    def test_freeze_user_final_grade_multiple_calls(self, mock_refr):
        """
        Test for freeze_user_final_grade function in case it is called multiple times
        """
        fg_qset = FinalGrade.objects.filter(user=self.user, course_run=self.run_fa)
        assert fg_qset.count() == 0

        # first call
        final_grade = api.freeze_user_final_grade(self.user, self.run_fa)
        assert final_grade is not None
        mock_refr.assert_called_once_with(self.user)
        assert fg_qset.count() == 1

        # second call
        final_grade = api.freeze_user_final_grade(self.user, self.run_fa)
        assert final_grade is not None
        assert mock_refr.call_count == 2
        assert fg_qset.count() == 1
