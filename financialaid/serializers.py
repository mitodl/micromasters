"""
Serializers from financialaid
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
    get_no_discount_tier_program
)
from financialaid.models import (
    FinancialAid,
    FinancialAidStatus,
    TierProgram
)


class IncomeValidationSerializer(serializers.Serializer):
    """
    Serializer for Financial Aid objects to validate income
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
        if self.validated_data["original_currency"] != "USD":
            raise ValidationError("Only USD supported currently")
        user = self.context["request"].user
        tier_program = determine_tier_program(self.validated_data["program"], self.validated_data["original_income"])

        financial_aid = FinancialAid.objects.create(
            original_income=self.validated_data["original_income"],
            original_currency=self.validated_data["original_currency"],
            tier_program=tier_program,
            user=user,
            income_usd=self.validated_data["original_income"],
            country_of_income=user.profile.country,
            date_exchange_rate=datetime.datetime.now()
        )

        if determine_auto_approval(financial_aid) is True:
            financial_aid.status = FinancialAidStatus.AUTO_APPROVED
        else:
            financial_aid.status = FinancialAidStatus.PENDING_DOCS
        financial_aid.save()

        # Add auditing here

        return financial_aid


class FinancialAidActionSerializer(serializers.Serializer):
    """
    Serializer for financial aid status
    """
    action = ChoiceField(choices=[FinancialAidStatus.REJECTED, FinancialAidStatus.APPROVED], write_only=True)
    tier_program_id = IntegerField(write_only=True)

    def validate(self, data):
        """
        Validators for this serializer
        """
        try:
            data["tier_program"] = TierProgram.objects.get(
                id=data["tier_program_id"],
                program=self.instance.tier_program.program_id
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
        if self.instance.status == FinancialAidStatus.APPROVED:
            self.instance.tier_program = tier_program
        elif self.instance.status == FinancialAidStatus.REJECTED:
            self.instance.tier_program = get_no_discount_tier_program(self.instance.tier_program.program_id)
        self.instance.save()

        # add auditing here

        return self.instance


class GetLearnerPriceForCourseSerializer(serializers.Serializer):
    """
    Serializer for retrieving learner price for course
    """
    user_id = IntegerField()
