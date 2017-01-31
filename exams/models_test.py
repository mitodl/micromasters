"""
Tests for exam models
"""
from unittest import TestCase

from exams.models import (
    ExamAuthorization,
    ExamProfile,
)


class ExamProfileTest(TestCase):
    """Tests for ExamProfiles"""

    def test_exam_profile_str(self):
        """
        Test method ExamProfile.__str__ prints correctly
        """
        ep = ExamProfile(id=1, status=ExamProfile.PROFILE_IN_PROGRESS)

        assert str(ep) == 'Exam Profile "1" with status "in-progress"'


class ExamAuthorizationTest(TestCase):
    """Tests for ExamAuthorizationss"""

    def test_exam_authorization_str(self):
        """
        Test method ExamAuthorization.__str__ prints correctly
        """
        auth = ExamAuthorization(id=1, status=ExamProfile.PROFILE_IN_PROGRESS, user_id=2)

        assert str(auth) == 'Exam Authorization "1" with status "in-progress" for user 2'
