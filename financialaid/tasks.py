"""
Periodic task that updates currency exchange rates.
"""
import requests
from django.conf import settings

from financialaid.models import CurrencyExchangeRate
from micromasters.celery import async


@async.task
def update_currency_exchange_rates():
    """
    Updates all CurrencyExchangeRate objects to reflect latest exchange rates from
    Open Exchange Rates API (https://openexchangerates.org/).
    """
    url = "{url}latest.json?app_id={app_id}".format(
        url=settings.OPEN_EXCHANGE_RATES_URL,
        app_id=settings.OPEN_EXCHANGE_RATES_APP_ID
    )
    resp = requests.get(url).json()
    latest_rates = resp["rates"]
    for currency_exchange_rate in CurrencyExchangeRate.objects.all():
        if currency_exchange_rate.currency_code in latest_rates:
            currency_exchange_rate.exchange_rate = latest_rates.pop(currency_exchange_rate.currency_code)
            currency_exchange_rate.save()
        else:
            currency_exchange_rate.delete()
    for key in latest_rates:
        CurrencyExchangeRate.objects.create(currency_code=key, exchange_rate=latest_rates[key])
