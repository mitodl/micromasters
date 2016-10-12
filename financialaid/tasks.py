"""
Periodic task that updates currency exchange rates.
"""
import requests

from financialaid.api import update_currency_exchange_rate
from financialaid.constants import CURRENCY_EXCHANGE_RATE_API_REQUEST_URL
from financialaid.exceptions import ExceededAPICallsException, UnexpectedAPIErrorException
from micromasters.celery import async


@async.task
def sync_currency_exchange_rates():
    """
    Updates all CurrencyExchangeRate objects to reflect latest exchange rates from
    Open Exchange Rates API (https://openexchangerates.org/).
    """
    resp = requests.get(CURRENCY_EXCHANGE_RATE_API_REQUEST_URL)
    resp_json = resp.json()
    # check specifically if maximum number of api calls per month has been exceeded
    if resp.status_code == 429:
        raise ExceededAPICallsException(resp_json["description"])
    elif resp.status_code != 200:  # check for other API errors
        raise UnexpectedAPIErrorException(resp_json["description"])
    latest_rates = resp_json["rates"]
    update_currency_exchange_rate(latest_rates)
