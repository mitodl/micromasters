"""
Constants for financialaid
"""
from urllib.parse import quote_plus

from django.conf import settings


class FinancialAidJustification:
    """
    Justifications for financial aid decisions
    """
    OKAY = "Documents in order"
    NOT_NOTARIZED = "Docs not notarized"
    INSUFFICIENT = "Insufficient docs"
    INCOME_INACCURATE = "Inaccurate income reported"
    COUNTRY_INACCURATE = "Inaccurate country reported"

    ALL_JUSTIFICATIONS = [OKAY, NOT_NOTARIZED, INSUFFICIENT, INCOME_INACCURATE, COUNTRY_INACCURATE]


class FinancialAidStatus:
    """Statuses for the Financial Aid model"""
    APPROVED = 'approved'
    AUTO_APPROVED = 'auto-approved'
    CREATED = 'created'
    DOCS_SENT = 'docs-sent'
    PENDING_DOCS = 'pending-docs'
    PENDING_MANUAL_APPROVAL = 'pending-manual-approval'
    SKIPPED = 'skipped'
    RESET = 'reset'

    ALL_STATUSES = [
        APPROVED,
        AUTO_APPROVED,
        CREATED,
        DOCS_SENT,
        PENDING_DOCS,
        PENDING_MANUAL_APPROVAL,
        SKIPPED,
        RESET
    ]
    TERMINAL_STATUSES = [APPROVED, AUTO_APPROVED, SKIPPED]

    STATUS_MESSAGES_DICT = {
        APPROVED: "Approved",
        AUTO_APPROVED: "Auto-Approved",
        CREATED: "--",
        DOCS_SENT: "Documents Sent by User",
        PENDING_DOCS: "Started Applications",
        PENDING_MANUAL_APPROVAL: "Pending Approval (Documents Received)",
        SKIPPED: "Skipped",
    }

FINANCIAL_AID_RESET_SUBJECT = "Update to your personalized course price for {program_name} MicroMasters"
FINANCIAL_AID_DOCUMENTS_RECEIVED_SUBJECT = "Documents received for {program_name} MicroMasters"
FINANCIAL_AID_APPROVAL_SUBJECT = "Your personalized course price for {program_name} MicroMasters"

FINANCIAL_AID_EMAIL_BODY = (
    "Dear {first_name},\n\n"
    "{message}\n\n"
    "Thank you,\n"
    "The {program_name} MicroMasters team"
)

FINANCIAL_AID_DOCUMENTS_RECEIVED_MESSAGE = (
    "We have received your documents verifying your income. We will review and process them within "
    "5 working days. If you have not received a confirmation email within one week, please feel free "
    "to reply to this email. Otherwise you should receive a confirmation email with your course price. "
    "\n\n"
    "While you are waiting, we encourage you to enroll now and pay later, when a decision has been "
    "reached."
)
FINANCIAL_AID_APPROVAL_MESSAGE = (
    "After reviewing your income documentation, the {program_name} MicroMasters team has determined "
    "that your personalized course price is ${price}.\n\n"
    "You can pay for MicroMasters courses through the MITx MicroMasters portal "
    "(https://micromasters.mit.edu/dashboard). All coursework will be conducted on edx.org."
)

FINANCIAL_AID_DOCUMENTS_RESET_MESSAGE = (
    "As requested, we have reset your personalized course price. Please visit "
    "the MITx MicroMasters dashboard and re-submit your annual income information."
)

DEFAULT_INCOME_THRESHOLD = 75000


def get_currency_exchange_rate_api_request_url():
    """
    Helper function to build the CURRENCY_EXCHANGE_RATE_API_REQUEST_URL
    """
    if settings.OPEN_EXCHANGE_RATES_URL and settings.OPEN_EXCHANGE_RATES_APP_ID:
        return "{url}latest.json?app_id={app_id}".format(
            url=settings.OPEN_EXCHANGE_RATES_URL,
            app_id=quote_plus(settings.OPEN_EXCHANGE_RATES_APP_ID)
        )
    else:
        return None  # pragma: no cover
