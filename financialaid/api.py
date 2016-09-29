"""
API helper functions for financialaid
"""
from django.db import transaction
from rest_framework.exceptions import ValidationError

from dashboard.models import ProgramEnrollment
from financialaid.constants import (
    COUNTRY_INCOME_THRESHOLDS,
    DEFAULT_INCOME_THRESHOLD
)
from financialaid.exceptions import NotSupportedException
from financialaid.models import (
    CurrencyExchangeRate,
    FinancialAid,
    FinancialAidStatus,
    TierProgram
)


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
    return tier_program


def determine_auto_approval(financial_aid):
    """
    Takes income and country code and returns a boolean if auto-approved.
    Args:
        financial_aid (FinancialAid): the financial aid object to determine auto-approval
    Returns:
        boolean: True if auto-approved, False if not
    """
    income_threshold = COUNTRY_INCOME_THRESHOLDS.get(financial_aid.country_of_income, DEFAULT_INCOME_THRESHOLD)
    # The income_threshold == 0 is because in all cases BUT threshold == 0, it's strictly > instead of >=
    return financial_aid.income_usd > income_threshold or income_threshold == 0


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
    return TierProgram.objects.get(program_id=program_id, current=True, discount_amount=0)


def get_course_price_for_learner(learner, program):
    """
    Returns dictionary of information about the course price for a learner. Raises DRF ValidationError
    if learner is not enrolled in this course.
    Args:
        learner (User): the learner whose price we're retrieving
        program (Program): the program whose price we're retrieving
    Returns:
        dict: {
            "course_price": float - the course price
            "financial_aid_adjustment": bool - if financial aid is approved and has been applied to this course price,
            "financial_aid_availability": bool - Program.financial_aid_availability,
            "has_financial_aid_request": bool - if has a financial aid request
        }
    """
    # Validate that learner is enrolled in program
    try:
        ProgramEnrollment.objects.get(user=learner, program=program)
    except ProgramEnrollment.DoesNotExist:
        raise ValidationError("Learner not enrolled in this program.")

    has_financial_aid_request = False
    financial_aid_adjustment = False
    financial_aid_availability = False
    course_price = program.get_course_price()

    if program.financial_aid_availability is True:
        financial_aid_availability = True
        # Check to see if learner has a financial aid request
        financial_aid_queryset = FinancialAid.objects.filter(
            user=learner,
            tier_program__program=program
        )
        if financial_aid_queryset.exists():
            has_financial_aid_request = True
            # FinancialAid.save() only allows one object per (user, tier_program__program) pair
            financial_aid = financial_aid_queryset.first()
            if financial_aid.status == FinancialAidStatus.APPROVED:
                # If the financial aid request is approved, adjust course price
                course_price = course_price - financial_aid.tier_program.discount_amount
                financial_aid_adjustment = True
    return {
        "course_price": course_price,
        "financial_aid_adjustment": financial_aid_adjustment,
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
