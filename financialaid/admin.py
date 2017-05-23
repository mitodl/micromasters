"""
Admin views for Financial Aid app
"""

from django.contrib import admin

from financialaid.models import (
    CountryIncomeThreshold,
    FinancialAid,
    FinancialAidAudit,
    Tier,
    TierProgram
)
from micromasters.utils import get_field_names


class CountryIncomeThresholdAdmin(admin.ModelAdmin):
    """Admin for CountryIncomeThreshold"""
    model = CountryIncomeThreshold
    list_display = ('country_code', 'income_threshold')
    ordering = ('country_code',)


class FinancialAidAdmin(admin.ModelAdmin):
    """Admin for FinancialAid"""
    model = FinancialAid

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class FinancialAidAuditAdmin(admin.ModelAdmin):
    """Admin for FinancialAidAudit"""
    model = FinancialAidAudit
    readonly_fields = get_field_names(FinancialAidAudit)

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False


class TierAdmin(admin.ModelAdmin):
    """Admin for Tier"""
    model = Tier
    list_display = ('name', 'description')


class TierProgramAdmin(admin.ModelAdmin):
    """Admin for TierProgram"""
    model = TierProgram
    list_display = ('tier', 'program', 'discount_amount', 'income_threshold', 'current')


admin.site.register(CountryIncomeThreshold, CountryIncomeThresholdAdmin)
admin.site.register(FinancialAid, FinancialAidAdmin)
admin.site.register(FinancialAidAudit, FinancialAidAuditAdmin)
admin.site.register(Tier, TierAdmin)
admin.site.register(TierProgram, TierProgramAdmin)
