"""
Periodic task that updates currency exchange rates.
"""
from urllib.parse import quote_plus

import requests

from django.conf import settings

from financialaid.api import update_currency_exchange_rate
from micromasters.celery import async


@async.task
def sync_currency_exchange_rates():
    """
    Updates all CurrencyExchangeRate objects to reflect latest exchange rates from
    Open Exchange Rates API (https://openexchangerates.org/).
    """
    url = quote_plus(
        "{url}latest.json?app_id={app_id}".format(
            url=settings.OPEN_EXCHANGE_RATES_URL,
            app_id=settings.OPEN_EXCHANGE_RATES_APP_ID
        )
    )
    resp = requests.get(url).json()
    latest_rates = resp["rates"]
    update_currency_exchange_rate(latest_rates)
