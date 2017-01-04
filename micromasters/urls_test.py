"""Tests for URLs"""

from unittest import TestCase
from django.core.urlresolvers import reverse


# pylint: disable=no-self-use
class URLTests(TestCase):
    """URL tests"""

    def test_urls(self):
        """Make sure URLs match with resolved names"""
        assert reverse('ui-500') == "/500/"
        assert reverse('ui-404') == "/404/"
        assert reverse('ui-users', kwargs={'user': 'x'}) == "/learner/x"
        assert reverse('terms_of_service') == '/terms_of_service/'
        assert reverse('program-list') == '/api/v0/programs/'
        assert reverse('profile-detail', kwargs={'user': 'xyz'}) == '/api/v0/profiles/xyz/'
        assert reverse('dashboard_api') == '/api/v0/dashboard/'
        assert reverse('search_api', kwargs={'elastic_url': 'elastic'}) == '/api/v0/search/elastic'
        assert reverse('checkout') == '/api/v0/checkout/'
        assert reverse('user_program_enrollments') == '/api/v0/enrolledprograms/'
        assert reverse('user_course_enrollments') == '/api/v0/course_enrollments/'
        assert reverse('search_result_mail_api') == '/api/v0/mail/'
        assert reverse('financial_aid_mail_api', kwargs={'financial_aid_id': 3}) == '/api/v0/financial_aid_mail/3/'
        assert reverse('financial_aid_action', kwargs={'financial_aid_id': 3}) == '/api/v0/financial_aid_action/3/'
        assert reverse('review_financial_aid', kwargs={'program_id': 5}) == '/financial_aid/review/5'
        assert reverse(
            'review_financial_aid',
            kwargs={'program_id': 5, 'status': 'xyz'}
        ) == '/financial_aid/review/5/xyz'
        assert reverse('financial_aid_skip', kwargs={'program_id': 3}) == '/api/v0/financial_aid_skip/3/'
        assert reverse('financial_aid', kwargs={'financial_aid_id': 123}) == '/api/v0/financial_aid/123/'
        assert reverse('course_price_list') == '/api/v0/course_prices/'
        assert reverse('course_price_detail', kwargs={'program_id': 4}) == '/api/v0/course_prices/4/'
        assert reverse('order-fulfillment') == '/api/v0/order_fulfillment/'
