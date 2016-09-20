"""
API helper functions for financialaid
"""
from financialaid.constants import COUNTRY_INCOME_THRESHOLDS, DEFAULT_INCOME_THRESHOLD


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
