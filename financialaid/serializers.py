"""
Serializers from financial aid
"""
import logging
import copy

from django.db.models import Max, Min, Q
from django.core.exceptions import ImproperlyConfigured
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.fields import (
    CharField,
    ChoiceField,
    FloatField,
    IntegerField,
    DecimalField,
    BooleanField,
)

from courses.models import Program
from dashboard.models import ProgramEnrollment
from financialaid.api import (
    determine_auto_approval,
    determine_tier_program,
    determine_income_usd,
)
from financialaid.constants import (
    FinancialAidJustification,
    FinancialAidStatus
)
from financialaid.exceptions import NotSupportedException
from financialaid.models import (
    FinancialAid,
    TierProgram
)
from mail.api import MailgunClient
from mail.utils import generate_financial_aid_email
from micromasters.utils import now_in_utc
from profiles.util import is_profile_filled_out


log = logging.getLogger(__name__)


class FinancialAidRequestSerializer(serializers.Serializer):
    """
    Serializer for financial aid requests
    """
    original_income = FloatField(min_value=0)
    original_currency = CharField()
    program_id = IntegerField()

    def validate(self, attrs):
        """
        Validators for this serializer
        """
        attrs["program"] = get_object_or_404(Program, pk=attrs["program_id"])
        if not attrs["program"].financial_aid_availability:
            raise ValidationError("Financial aid not available for this program.")
        if not ProgramEnrollment.objects.filter(program=attrs["program"], user=self.context["request"].user).exists():
            raise ValidationError("User not in program.")
        if not is_profile_filled_out(self.context["request"].user.profile):
            raise ValidationError("Profile is not complete")
        return attrs

    def save(self, **kwargs):
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
        tier_program = determine_tier_program(self.validated_data["program"], income_usd)

        financial_aid = FinancialAid.objects.create(
            original_income=self.validated_data["original_income"],
            original_currency=self.validated_data["original_currency"],
            tier_program=tier_program,
            user=user,
            income_usd=income_usd,
            country_of_income=user.profile.country,
            date_exchange_rate=now_in_utc(),
            country_of_residence=user.profile.country,
        )

        if determine_auto_approval(financial_aid, tier_program) is True:
            financial_aid.status = FinancialAidStatus.AUTO_APPROVED
        else:
            financial_aid.status = FinancialAidStatus.PENDING_DOCS
        financial_aid.save_and_log(user)

        return financial_aid


class FinancialAidActionSerializer(serializers.Serializer):
    """
    Serializer for financial aid actions
    """
    action = ChoiceField(
        choices=[
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.PENDING_MANUAL_APPROVAL,
            FinancialAidStatus.RESET
        ],
        write_only=True
    )
    tier_program_id = IntegerField(write_only=True)
    justification = ChoiceField(
        choices=FinancialAidJustification.ALL_JUSTIFICATIONS,
        default=None,
        write_only=True
    )

    def validate(self, attrs):
        """
        Validators for this serializer
        """
        # Required field
        if attrs.get("action") is None:
            raise ValidationError({"action": "This field is required."})
        # For approving
        if attrs["action"] == FinancialAidStatus.APPROVED:
            # Required fields
            if attrs.get("tier_program_id") is None:
                raise ValidationError({"tier_program_id": "This field is required."})
            if attrs.get("justification") is None:
                raise ValidationError({"justification": "This field is required."})
            # Required instance status
            if self.instance.status != FinancialAidStatus.PENDING_MANUAL_APPROVAL:
                raise ValidationError("Cannot approve an application that is not pending manual approval.")
            # Check tier program exists
            try:
                attrs["tier_program"] = TierProgram.objects.get(
                    id=attrs["tier_program_id"],
                    program_id=self.instance.tier_program.program_id,
                    current=True
                )
            except TierProgram.DoesNotExist:
                raise ValidationError({"tier_program_id": "Financial Aid Tier does not exist for this program."})
        # For marking documents received
        if attrs["action"] == FinancialAidStatus.PENDING_MANUAL_APPROVAL:
            if self.instance.status not in [FinancialAidStatus.PENDING_DOCS, FinancialAidStatus.DOCS_SENT]:
                raise ValidationError("Cannot mark documents as received for an application not awaiting docs.")
        return attrs

    def save(self, **kwargs):
        """
        Save method for this serializer
        """
        self.instance.status = self.validated_data["action"]
        if self.instance.status == FinancialAidStatus.APPROVED:
            self.instance.tier_program = self.validated_data["tier_program"]
            self.instance.justification = self.validated_data["justification"]
        elif self.instance.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL:
            # This is intentionally left blank for clarity that this is a valid status for .save()
            pass
        elif self.instance.status == FinancialAidStatus.RESET:
            self.instance.justification = "Reset via the financial aid review form"

        # also saves history of this change in FinancialAidAudit.
        self.instance.save_and_log(self.context["request"].user)

        # Send email notification
        MailgunClient.send_financial_aid_email(
            acting_user=self.context["request"].user,
            financial_aid=self.instance,
            **generate_financial_aid_email(self.instance)
        )

        return self.instance


class FinancialAidSerializer(serializers.ModelSerializer):
    """
    Serializer for indicating financial documents have been sent
    """
    def validate(self, attrs):
        """
        Validate method for this serializer
        """
        if self.instance.status != FinancialAidStatus.PENDING_DOCS:
            raise ValidationError(
                "Cannot indicate documents sent for an application that is not pending documents"
            )
        return attrs

    def save(self, **kwargs):
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


class FormattedCoursePriceSerializer(serializers.Serializer):
    """
    Serializer for the format returned by
    `financialaid.api.get_formatted_course_price`.
    Primarily exists to convert `price` from decimal to string.
    """
    program_id = IntegerField()
    price = DecimalField(max_digits=None, decimal_places=2)
    financial_aid_availability = BooleanField()
    has_financial_aid_request = BooleanField()


class FinancialAidDashboardSerializer:
    """
    Serializer of financial aid information for the dashboard API
    """
    default_serialized = {
        "id": None,
        "has_user_applied": None,
        "application_status": None,
        "min_possible_cost": None,
        "max_possible_cost": None,
        "date_documents_sent": None,
    }

    @classmethod
    def serialize(cls, user, program):
        """
        Serializes financial aid info for a user in a program
        """
        if not program.financial_aid_availability:
            return {}
        serialized = copy.copy(cls.default_serialized)
        financial_aid_qset = FinancialAid.objects.filter(
            Q(user=user) & Q(tier_program__program=program)
        ).exclude(status=FinancialAidStatus.RESET)
        serialized["has_user_applied"] = financial_aid_qset.exists()
        if serialized["has_user_applied"]:
            financial_aid = financial_aid_qset.first()
            serialized.update({
                "application_status": financial_aid.status,
                "date_documents_sent": financial_aid.date_documents_sent,
                "id": financial_aid.id
            })
        financial_aid_min_price, financial_aid_max_price = cls.get_program_price_range(program)
        serialized.update({
            "min_possible_cost": financial_aid_min_price,
            "max_possible_cost": financial_aid_max_price
        })
        return serialized

    @classmethod
    def get_program_price_range(cls, program):
        """
        Returns the financial aid possible cost range
        """
        course_max_price = program.price
        # get all the possible discounts for the program
        program_tiers_qset = TierProgram.objects.filter(
            Q(program=program) & Q(current=True)).order_by('discount_amount')
        if not program_tiers_qset.exists():
            log.error('The program "%s" needs at least one tier configured', program.title)
            raise ImproperlyConfigured(
                'The program "{}" needs at least one tier configured'.format(program.title))
        min_discount = program_tiers_qset.aggregate(
            Min('discount_amount')).get('discount_amount__min', 0)
        max_discount = program_tiers_qset.aggregate(
            Max('discount_amount')).get('discount_amount__max', 0)
        return course_max_price - max_discount, course_max_price - min_discount
