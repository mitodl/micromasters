"""
Periodic task that updates currency exchange rates.
"""
import requests

from financialaid.api import update_currency_exchange_rate
from financialaid.constants import CURRENCY_EXCHANGE_RATE_API_REQUEST_URL
from micromasters.celery import async


@async.task
def sync_currency_exchange_rates():
    """
    Updates all CurrencyExchangeRate objects to reflect latest exchange rates from
    Open Exchange Rates API (https://openexchangerates.org/).
    """
    resp = requests.get(CURRENCY_EXCHANGE_RATE_API_REQUEST_URL).json()
    latest_rates = resp["rates"]
    update_currency_exchange_rate(latest_rates)
