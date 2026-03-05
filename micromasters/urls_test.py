"""Tests for URLs"""

from unittest import TestCase

from django.urls import reverse


class URLTests(TestCase):
    """URL tests"""

    def test_urls(self):
        """Make sure URLs match with resolved names"""
        assert reverse('ui-500') == "/500/"
        assert reverse('ui-404') == "/404/"
        assert reverse('ui-users', kwargs={'user': 'x'}) == "/learner/x"
        assert reverse('ui-users', kwargs={'user': 'x+y'}) == "/learner/x+y"
        assert reverse('program-list') == '/api/v0/programs/'
        assert reverse('profile-detail', kwargs={'user': 'xyz'}) == '/api/v0/profiles/xyz/'
        assert reverse('profile-detail', kwargs={'user': 'abc+xyz'}) == '/api/v0/profiles/abc+xyz/'
        assert reverse('dashboard_api', args=['username']) == '/api/v0/dashboard/username/'
        assert reverse('dashboard_api', args=['user+name']) == '/api/v0/dashboard/user+name/'
        assert reverse('search_api', kwargs={'opensearch_url': 'opensearch'}) == '/api/v0/search/opensearch'
        assert reverse('user_program_enrollments') == '/api/v0/enrolledprograms/'
        assert reverse('user_course_enrollments') == '/api/v0/course_enrollments/'
        assert reverse('search_result_mail_api') == '/api/v0/mail/search/'
        assert reverse('learner_mail_api', kwargs={'student_id': 123}) == '/api/v0/mail/learner/123/'
