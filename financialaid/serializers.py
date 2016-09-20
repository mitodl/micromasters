"""
Serializers from financialaid
"""
import datetime

from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.fields import IntegerField, FloatField, CharField

from courses.models import Program
from dashboard.models import ProgramEnrollment
from financialaid.api import determine_tier_program, determine_auto_approval
from financialaid.models import FinancialAid, FinancialAidStatus


class IncomeValidationSerializer(serializers.Serializer):
    """
    Serializer for Financial Aid objects
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
