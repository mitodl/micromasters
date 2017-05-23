"""
Periodic task that updates currency exchange rates.
"""
import requests

from financialaid.api import update_currency_exchange_rate
from financialaid.constants import get_currency_exchange_rate_api_request_url
from financialaid.exceptions import ExceededAPICallsException, UnexpectedAPIErrorException
from micromasters.celery import app


@app.task
def sync_currency_exchange_rates():
    """
    Updates all CurrencyExchangeRate objects to reflect latest exchange rates from
    Open Exchange Rates API (https://openexchangerates.org/).
    """
    CURRENCY_EXCHANGE_RATE_API_REQUEST_URL = get_currency_exchange_rate_api_request_url()
    if not CURRENCY_EXCHANGE_RATE_API_REQUEST_URL:
        msg = (
            "Currency exchange API URL cannot be determined. "
            "Ensure that the OPEN_EXCHANGE_RATES_URL setting "
            "and the OPEN_EXCHANGE_RATES_APP_ID setting are both set."
        )
        raise RuntimeError(msg)
    resp = requests.get(CURRENCY_EXCHANGE_RATE_API_REQUEST_URL)
    resp_json = resp.json()
    # check specifically if maximum number of api calls per month has been exceeded
    if resp.status_code == 429:
        raise ExceededAPICallsException(resp_json["description"])
    elif resp.status_code != 200:  # check for other API errors
        raise UnexpectedAPIErrorException(resp_json["description"])
    latest_rates = resp_json["rates"]
    update_currency_exchange_rate(latest_rates)
