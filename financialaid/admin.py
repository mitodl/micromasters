"""
Admin views for Financial Aid app
"""

from django.contrib import admin

from financialaid.models import (
    FinancialAid,
    FinancialAidAudit,
    TierProgram,
    Tier,
)


class FinancialAidAdmin(admin.ModelAdmin):
    """Admin for FinancialAid"""
    model = FinancialAid

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class FinancialAidAuditAdmin(admin.ModelAdmin):
    """Admin for FinancialAidAudit"""
    model = FinancialAidAudit

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument
        return False

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument
        return False


class TierProgramAdmin(admin.ModelAdmin):
    """Admin for TierProgram"""
    model = TierProgram
    list_display = ('tier', 'program', 'discount_amount', 'income_threshold', 'current')


class TierAdmin(admin.ModelAdmin):
    """Admin for Tier"""
    model = Tier
    list_display = ('name', 'description')

admin.site.register(FinancialAid, FinancialAidAdmin)
admin.site.register(FinancialAidAudit, FinancialAidAuditAdmin)
admin.site.register(TierProgram, TierProgramAdmin)
admin.site.register(Tier, TierAdmin)
