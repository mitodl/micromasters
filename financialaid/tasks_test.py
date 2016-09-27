"""
Test for financialaid celery tasks
"""
from django.test import (
    override_settings,
    TestCase
)
from mock import patch

from financialaid.models import CurrencyExchangeRate
from financialaid.tasks import update_currency_exchange_rates


@patch('financialaid.tasks.requests.get')
class TasksTest(TestCase):
    """
    Tests for periodic task which which updates currency exchange rates from Open
    Exchange Rates.
    """

    @classmethod
    def setUpTestData(cls):
        super(TasksTest, cls).setUpTestData()
        CurrencyExchangeRate.objects.create(
            currency_code="DEF",
            exchange_rate=1.8
        )
        CurrencyExchangeRate.objects.create(
            currency_code="MNO",
            exchange_rate=2.1
        )

    def setUp(self):
        super(TasksTest, self).setUp()
        self.data = {
            "extraneous information": "blah blah blah",
            "rates": {
                "DEF": "2",
                "MNO": "1.7",
                "PQR": "0.4"
            }
        }

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_celery_task_works(self, *args):  # pylint: disable=unused-argument
        """
        Assert task schedule using celery beat.
        """
        self.assertTrue(update_currency_exchange_rates.delay())

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_update_currency_exchange_rates(self, mocked_request):
        """
        Assert currency exchange rates are actually updated
        """
        mocked_request.return_value.json.return_value = self.data
        assert CurrencyExchangeRate.objects.count() == 2
        update_currency_exchange_rates.apply(args=()).get()
        assert CurrencyExchangeRate.objects.count() == 3
        currency = CurrencyExchangeRate.objects.get(currency_code="MNO")
        assert currency.exchange_rate == 1.7
        currency = CurrencyExchangeRate.objects.get(currency_code="DEF")
        assert currency.exchange_rate == 2
        currency = CurrencyExchangeRate.objects.get(currency_code="PQR")
        assert currency.exchange_rate == 0.4
