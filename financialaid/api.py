"""
API helper functions for financialaid
"""
import logging

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from financialaid.constants import DEFAULT_INCOME_THRESHOLD, FinancialAidStatus
from financialaid.exceptions import NotSupportedException
from financialaid.models import (
    CountryIncomeThreshold,
    CurrencyExchangeRate,
    FinancialAid,
    TierProgram
)


log = logging.getLogger(__name__)


def determine_tier_program(program, income):
    """
    Determines and returns the TierProgram for a given income.
    Args:
        program (Program): the Program to determine a TierProgram for
        income (numeric): the income of the User
    Returns:
        TierProgram: the TierProgram for the Program given the User's income
    """
    # To determine the tier for a user, find the set of every tier whose income threshold is
    # less than or equal to the income of the user. The highest tier out of that set will
    # be the tier assigned to the user.
    tier_programs_set = program.tier_programs.filter(current=True, income_threshold__lte=income)
    tier_program = tier_programs_set.order_by("-income_threshold").first()
    if tier_program is None:
        message = (
            "$0-income-threshold TierProgram has not yet been configured for Program "
            "with id {program_id}.".format(program_id=program.id)
        )
        log.error(message)
        raise ImproperlyConfigured(message)
    return tier_program


def determine_auto_approval(financial_aid, tier_program):
    """
    Takes income and country code and returns a boolean if auto-approved. Logs an error if the country of
    financial_aid does not exist in CountryIncomeThreshold.
    Args:
        financial_aid (FinancialAid): the financial aid object to determine auto-approval
        tier_program (TierProgram): the TierProgram for the user's income level
    Returns:
        boolean: True if auto-approved, False if not
    """
    try:
        country_income_threshold = CountryIncomeThreshold.objects.get(country_code=financial_aid.country_of_income)
        income_threshold = country_income_threshold.income_threshold
    except CountryIncomeThreshold.DoesNotExist:
        log.error(
            "Country code %s does not exist in CountryIncomeThreshold for financial aid id %s",
            financial_aid.country_of_income,
            financial_aid.id
        )
        income_threshold = DEFAULT_INCOME_THRESHOLD
    if tier_program.discount_amount == 0:
        # There is no discount so no reason to go through the financial aid workflow
        return True
    elif income_threshold == 0:
        # There is no income which we need to check the financial aid application
        return True
    else:
        return financial_aid.income_usd > income_threshold


def determine_income_usd(original_income, original_currency):
    """
    Take original income and original currency and converts income from the original currency
    to USD.
    Args:
        original_income (numeric): original income, in original currency (for a FinancialAid object)
        original_currency (str): original currency, a three-letter code
    Returns:
        float: the original income converted to US dollars
    """
    if original_currency == "USD":
        return original_income
    try:
        exchange_rate_object = CurrencyExchangeRate.objects.get(currency_code=original_currency)
    except CurrencyExchangeRate.DoesNotExist:
        raise NotSupportedException("Currency not supported")
    exchange_rate = exchange_rate_object.exchange_rate
    income_usd = original_income / exchange_rate
    return income_usd


def get_no_discount_tier_program(program_id):
    """
    Takes a program_id and returns the no discount TierProgram for that Program
    Args:
        program_id (int): the id of the Program object
    Returns:
        TierProgram: the no discount TierProgram program associated with the Program
    """
    try:
        return TierProgram.objects.get(program_id=program_id, current=True, discount_amount=0)
    except TierProgram.DoesNotExist:
        message = "No-discount TierProgram has not yet been configured for Program with id {program_id}.".format(
            program_id=program_id
        )
        log.error(message)
        raise ImproperlyConfigured(message)


def get_formatted_course_price(program_enrollment):
    """
    Returns dictionary of information about the course price for a learner.

    Note: "price" will always include discounts from financial aid applications, even if the
    application's status is not yet approved.

    Args:
        program_enrollment (ProgramEnrollment): program enrollment record for the learner
            whose price we're retrieving
    Returns:
        dict: {
            "program_id": int - the Program's id
            "price": float - the course price minus any discounts (whether or not it's approved)
            "financial_aid_availability": bool - Program.financial_aid_availability,
            "has_financial_aid_request": bool - if has a financial aid request
        }
    """
    user = program_enrollment.user
    program = program_enrollment.program

    has_financial_aid_request = False
    financial_aid_availability = False
    course_price = program.price

    if program.financial_aid_availability is True:
        financial_aid_availability = True
        # Check to see if learner has a financial aid request
        financial_aid_queryset = FinancialAid.objects.filter(
            user=user,
            tier_program__program=program
        ).exclude(status=FinancialAidStatus.RESET)
        if financial_aid_queryset.exists():
            has_financial_aid_request = True
            # FinancialAid.save() only allows one object per (user, tier_program__program) pair
            financial_aid = financial_aid_queryset.first()
            course_price = course_price - financial_aid.tier_program.discount_amount
    return {
        "program_id": program.id,
        "price": course_price,
        "financial_aid_availability": financial_aid_availability,
        "has_financial_aid_request": has_financial_aid_request
    }


@transaction.atomic
def update_currency_exchange_rate(latest_rates):
    """
    Updates all CurrencyExchangeRate objects based on the latest rates.
    Args:
        latest_rates (dict): latest exchange rates from Open Exchange Rates API
    Returns:
        None
    """
    rates = latest_rates.copy()  # So we don't modify the passed parameter
    for currency_exchange_rate in CurrencyExchangeRate.objects.all():
        if currency_exchange_rate.currency_code in rates:
            currency_exchange_rate.exchange_rate = rates.pop(currency_exchange_rate.currency_code)
            currency_exchange_rate.save()
        else:
            currency_exchange_rate.delete()
    for key in rates:
        CurrencyExchangeRate.objects.create(currency_code=key, exchange_rate=rates[key])
