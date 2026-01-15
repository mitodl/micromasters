"""
Admin views for Mail app
"""

from django.contrib import admin

from mail.models import FinancialAidEmailAudit, PartnerSchool
from micromasters.utils import get_field_names


@admin.register(FinancialAidEmailAudit)
class FinancialAidEmailAuditAdmin(admin.ModelAdmin):
    """Admin for FinancialAidEmailAudit"""
    model = FinancialAidEmailAudit
    readonly_fields = get_field_names(FinancialAidEmailAudit)

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, signature-differs
        return False


@admin.register(PartnerSchool)
class PartnerSchoolAdmin(admin.ModelAdmin):
    """ModelAdmin for PartnerSchool"""
    list_display = ('name', 'email', )
    ordering = ('name', 'email', )
