"""
Utils for mail
"""
import logging

from django.core.exceptions import ValidationError

from dashboard.models import ProgramEnrollment
from financialaid.api import get_formatted_course_price
from financialaid.constants import (
    FINANCIAL_AID_APPROVAL_MESSAGE,
    FINANCIAL_AID_APPROVAL_SUBJECT,
    FINANCIAL_AID_DOCUMENTS_RECEIVED_MESSAGE,
    FINANCIAL_AID_DOCUMENTS_RESET_MESSAGE,
    FINANCIAL_AID_RESET_SUBJECT,
    FINANCIAL_AID_DOCUMENTS_RECEIVED_SUBJECT,
    FINANCIAL_AID_EMAIL_BODY,
    FinancialAidStatus
)


log = logging.getLogger(__name__)

RECIPIENT_VARIABLE_NAMES = {
    'PreferredName': 'preferred_name',
    'Email': 'email',
}


def generate_financial_aid_email(financial_aid):
    """
    Generates the email subject and body for a FinancialAid status update. Accepted statuses are
    FinancialAidStatus.APPROVED and FinancialAidStatus.PENDING_MANUAL_APPROVAL (documents have been received).
    Args:
        financial_aid (FinancialAid): The FinancialAid object in question
    Returns:
        dict: {"subject": (str), "body": (str)}
    """
    if financial_aid.status == FinancialAidStatus.APPROVED:
        program_enrollment = ProgramEnrollment.objects.get(
            user=financial_aid.user,
            program=financial_aid.tier_program.program
        )
        message = FINANCIAL_AID_APPROVAL_MESSAGE.format(
            program_name=financial_aid.tier_program.program.title,
            price=get_formatted_course_price(program_enrollment)["price"]
        )
        subject = FINANCIAL_AID_APPROVAL_SUBJECT.format(program_name=financial_aid.tier_program.program.title)
    elif financial_aid.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL:
        message = FINANCIAL_AID_DOCUMENTS_RECEIVED_MESSAGE
        subject = FINANCIAL_AID_DOCUMENTS_RECEIVED_SUBJECT.format(
            program_name=financial_aid.tier_program.program.title
        )
    elif financial_aid.status == FinancialAidStatus.RESET:
        message = FINANCIAL_AID_DOCUMENTS_RESET_MESSAGE
        subject = FINANCIAL_AID_RESET_SUBJECT.format(
            program_name=financial_aid.tier_program.program.title
        )
    else:
        # django.core.exceptions.ValidationError
        raise ValidationError("Invalid status on FinancialAid for generate_financial_aid_email()")
    body = FINANCIAL_AID_EMAIL_BODY.format(
        first_name=financial_aid.user.profile.first_name,
        message=message,
        program_name=financial_aid.tier_program.program.title
    )
    return {"subject": subject, "body": body}


def generate_mailgun_response_json(response):
    """
    Generates the json object for the mailgun response.

    This is necessary because of inconsistent Response object formatting. Calling response.json() will return a valid
    JSON-serializable dictionary object, except when the response returns 401 (and maybe others) from mailgun, in which
    it will raise an exception because of improperly formatted content for the .json() call.

    This function solves that problem by raising ImproperlyConfigured if the response returns 401, which will be caught
    by a micromasters.utils.custom_exception_handler():

    Args:
        response (requests.Response): response object
    Returns:
        dict
    """
    try:
        response_json = response.json()
    except ValueError:  # Includes JSONDecodeError since it inherits from ValueError
        response_json = {
            "message": response.reason
        }
    return response_json


def filter_recipient_variables(text):
    """
    Filter out recipient variables, like [PreferredName], and substitute it with %recipient.preferred_name%
    Args:
        text (string): subject or body of the email
    Returns:
        string: with replaced correct recipient variables
    """

    for key, value in RECIPIENT_VARIABLE_NAMES.items():
        text = text.replace('[{}]'.format(key), '%recipient.{}%'.format(value))

    return text


def get_email_footer(url):
    """
    Construct a footer for email
    Args:
        url: To change the settings
    Returns:
        string: with the html styled footer
    """
    text = ("You are receiving this e-mail because you signed up for MITx"
            " MicroMasters.<br/> If you don't want to receive these emails in the"
            " future, you can<br/> <a href='{0}'>edit your settings</a>"
            " or <a href='{0}'>unsubscribe</a>.").format(url)
    return ("<div style='margin-top:80px; text-align: center; color: #757575;'>"
            "<div style='margin:auto; max-width:50%;'><p>{0}</p>"
            "<p>MIT Office of Digital Learning<br/>"
            "600 Technology Square, 2nd Floor, Cambridge, MA 02139</p>"
            "</div></div>").format(text)
