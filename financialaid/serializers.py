"""
Serializers from financial aid
"""
import datetime

from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.fields import (
    CharField,
    ChoiceField,
    FloatField,
    IntegerField
)

from courses.models import Program
from dashboard.models import ProgramEnrollment
from financialaid.api import (
    determine_auto_approval,
    determine_tier_program,
    determine_income_usd,
    get_no_discount_tier_program
)
from financialaid.constants import (
    FINANCIAL_AID_APPROVAL_MESSAGE_BODY,
    FINANCIAL_AID_APPROVAL_SUBJECT_TEXT,
    FINANCIAL_AID_REJECTION_MESSAGE_BODY,
    FINANCIAL_AID_REJECTION_SUBJECT_TEXT,
    FINANCIAL_AID_DOCUMENTS_SUBJECT_TEXT,
    FINANCIAL_AID_DOCUMENTS_MESSAGE_BODY
)
from financialaid.exceptions import NotSupportedException
from financialaid.models import (
    FinancialAid,
    FinancialAidStatus,
    TierProgram
)
from mail.api import MailgunClient


class FinancialAidRequestSerializer(serializers.Serializer):
    """
    Serializer for financial aid requests
    """
    original_income = FloatField(min_value=0)
    original_currency = CharField()
    program_id = IntegerField()

    def validate(self, data):
        """
        Validators for this serializer
        """
        data["program"] = get_object_or_404(Program, pk=data["program_id"])
        if not data["program"].financial_aid_availability:
            raise ValidationError("Financial aid not available for this program.")
        if not ProgramEnrollment.objects.filter(program=data["program"], user=self.context["request"].user).exists():
            raise ValidationError("User not in program.")
        return data

    def save(self):
        """
        Override save method
        """
        try:
            income_usd = determine_income_usd(
                self.validated_data["original_income"],
                self.validated_data["original_currency"]
            )
        except NotSupportedException:
            raise ValidationError("Currency not supported")
        user = self.context["request"].user
        tier_program = determine_tier_program(self.validated_data["program"], self.validated_data["original_income"])

        financial_aid = FinancialAid.objects.create(
            original_income=self.validated_data["original_income"],
            original_currency=self.validated_data["original_currency"],
            tier_program=tier_program,
            user=user,
            income_usd=income_usd,
            country_of_income=user.profile.country,
            date_exchange_rate=datetime.datetime.now()
        )

        if determine_auto_approval(financial_aid) is True:
            financial_aid.status = FinancialAidStatus.AUTO_APPROVED
        else:
            financial_aid.status = FinancialAidStatus.PENDING_DOCS
        financial_aid.save_and_log(user)

        return financial_aid


class FinancialAidSkipSerializer(serializers.Serializer):
    """
    Serializer for skipping financial aid
    """
    def validate(self, data):
        """
        Validators for this serializer
        """
        if self.instance.status in FinancialAidStatus.TERMINAL_STATUSES:
            raise ValidationError("Financial aid cannot be skipped once it has been approved, rejected, or skipped.")
        return data

    def save(self):
        """
        Updates and logs status change of FinancialAid object to "skipped"
        """
        self.instance.status = FinancialAidStatus.SKIPPED
        self.instance.tier_program = get_no_discount_tier_program(self.instance.tier_program.program.id)
        self.instance.save_and_log(self.context["request"].user)
        return self.instance


class FinancialAidActionSerializer(serializers.Serializer):
    """
    Serializer for financial aid actions
    """
    action = ChoiceField(
        choices=[
            FinancialAidStatus.REJECTED,
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.PENDING_MANUAL_APPROVAL
        ],
        write_only=True
    )
    tier_program_id = IntegerField(write_only=True)

    def validate(self, data):
        """
        Validators for this serializer
        """
        # Check that the previous financial aid status allows for the new status
        if (data['action'] == FinancialAidStatus.REJECTED and
                self.instance.status != FinancialAidStatus.PENDING_MANUAL_APPROVAL):
            raise ValidationError("Cannot reject application that is not pending manual approval.")
        if (data['action'] == FinancialAidStatus.APPROVED and
                self.instance.status != FinancialAidStatus.PENDING_MANUAL_APPROVAL):
            raise ValidationError("Cannot approve application that is not pending manual approval.")
        if (data['action'] == FinancialAidStatus.PENDING_MANUAL_APPROVAL and
                self.instance.status not in [FinancialAidStatus.PENDING_DOCS, FinancialAidStatus.DOCS_SENT]):
            raise ValidationError("Cannot mark documents as received for an application awaiting docs.")
        # Check tier program exists
        try:
            data["tier_program"] = TierProgram.objects.get(
                id=data["tier_program_id"],
                program_id=self.instance.tier_program.program_id,
                current=True
            )
        except TierProgram.DoesNotExist:
            raise ValidationError("Financial Aid Tier does not exist for this program.")
        return data

    def save(self):
        """
        Save method for this serializer
        """
        tier_program = self.validated_data["tier_program"]
        self.instance.status = self.validated_data["action"]
        email_data = {
            "acting_user": self.context["request"].user,
            "financial_aid": self.instance
        }
        if self.instance.status == FinancialAidStatus.APPROVED:
            self.instance.tier_program = tier_program
            email_data.update({
                "subject": FINANCIAL_AID_APPROVAL_SUBJECT_TEXT,
                "body": FINANCIAL_AID_APPROVAL_MESSAGE_BODY
            })
        elif self.instance.status == FinancialAidStatus.REJECTED:
            self.instance.tier_program = get_no_discount_tier_program(self.instance.tier_program.program_id)
            email_data.update({
                "subject": FINANCIAL_AID_REJECTION_SUBJECT_TEXT,
                "body": FINANCIAL_AID_REJECTION_MESSAGE_BODY
            })
        elif self.instance.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL:
            email_data.update({
                "subject": FINANCIAL_AID_DOCUMENTS_SUBJECT_TEXT,
                "body": FINANCIAL_AID_DOCUMENTS_MESSAGE_BODY
            })
        self.instance.save()
        # Send email notification
        MailgunClient.send_financial_aid_email(**email_data)

        return self.instance


class FinancialAidSerializer(serializers.ModelSerializer):
    """
    Serializer for indicating financial documents have been sent
    """
    def validate(self, data):
        """
        Validate method for this serializer
        """
        if self.instance.status != FinancialAidStatus.PENDING_DOCS:
            raise ValidationError(
                "Cannot indicate documents sent for an application that is not pending documents"
            )
        return data

    def save(self):
        """
        Save method for this serializer
        """
        self.instance.status = FinancialAidStatus.DOCS_SENT
        self.instance.date_documents_sent = self.validated_data["date_documents_sent"]
        self.instance.save()
        return self.instance

    class Meta:
        model = FinancialAid
        fields = ("date_documents_sent", )
