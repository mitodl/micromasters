"""
Generates CurrencyExchangeRate objects
"""
from django.core.management import BaseCommand

from financialaid.tasks import sync_currency_exchange_rates


class Command(BaseCommand):
    """
    Update the local database with the latest exchange rate information from the
    Open Exchange Rates API (openexchangerates.org)
    """
    help = "Updates local database with the latest exchange rate information from Open Exchange Rates API"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        sync_currency_exchange_rates()
