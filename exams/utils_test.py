"""Test cases for the exam util"""
import datetime
from ddt import ddt, data, unpack
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import CourseRunFactory
from exams.factories import ExamRunFactory
from exams.utils import (
    validate_profile,
    get_corresponding_course_run)
from micromasters.utils import now_in_utc
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase


@ddt
class ExamProfileValidationTests(MockedESTestCase):
    """Tests for exam utils validate_profile"""

    @classmethod
    def setUpTestData(cls):
        """
        Create a profile
        """
        super().setUpTestData()
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create()

    def setUp(self):
        """
        refresh profile
        """
        super().setUp()
        self.profile.refresh_from_db()

    def test_exam_profile_validated(self):
        """
        test validate_profile when a field is empty
        """
        assert validate_profile(self.profile) is True

    @data('address', 'city', 'state_or_territory', 'country', 'phone_number')
    def test_when_field_is_blank(self, field):
        """
        test validate_profile when a field is empty
        """
        setattr(self.profile, field, '')
        self.profile.save()
        assert validate_profile(self.profile) is False

    @data('address', 'city', 'state_or_territory', 'country', 'phone_number')
    def test_when_field_is_invalid(self, field):
        """
        test validate_profile when a field is invalid
        """
        setattr(self.profile, field, '汉字')
        self.profile.save()
        assert validate_profile(self.profile) is False

    @data(
        ('AD', '通州区', True),
        ('AD', '', True),
        ('CA', '通州区', False),
        ('CA', '', False),
        ('US', '通州区', False),
        ('US', '', False)
    )
    @unpack
    def test_postal_code(self, country, postal_code, result):
        """
        when postal_code is (not) required and valid/invalid
        """
        self.profile.country = country
        self.profile.postal_code = postal_code
        self.profile.save()
        assert validate_profile(self.profile) is result

    @data(
        ('汉字', 'Andrew', True),
        ('', 'Andrew', True),
        ('汉字', '', False),
        ('', '', False)
    )
    @unpack
    def test_romanized_name(self, name, romanized_name, result):
        """
        test romanized name optional/required
        """
        self.profile.first_name = name
        self.profile.romanized_first_name = romanized_name
        self.profile.save()
        assert validate_profile(self.profile) is result

    @data('汉字', '')
    def test_user_email(self, email):
        """
        test invalid email
        """
        self.profile.user.email = email
        self.profile.user.save()
        assert validate_profile(self.profile) is False


@ddt
class CorrespondingCourseRunTests(MockedESTestCase):
    """Test for past schedulable exam run"""

    @data(
        (1, True),
        (2, True),
        (4, True),
        (5, False),

    )
    @unpack
    def test_get_corresponding_course_run(self, weeks, has_course_run):
        """test get_past_recent_exam_run"""
        now = now_in_utc()
        exam_run = ExamRunFactory.create(date_first_schedulable=now+datetime.timedelta(weeks=weeks))
        expected = CourseRunFactory.create(
            course=exam_run.course,
            start_date=now-datetime.timedelta(weeks=16),
            end_date=now
        )
        if has_course_run:
            self.assertEqual(get_corresponding_course_run(exam_run), expected)
        else:
            self.assertEqual(get_corresponding_course_run(exam_run), None)
