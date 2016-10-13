"""
Admin views for Mail app
"""

from django.contrib import admin

from mail.models import FinancialAidEmailAudit


class FinancialAidEmailAuditAdmin(admin.ModelAdmin):
    """Admin for FinancialAidEmailAudit"""
    model = FinancialAidEmailAudit
    readonly_fields = [
        f.name for f in FinancialAidEmailAudit._meta.get_fields()  # pylint: disable=protected-access
        if not f.auto_created
    ]

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument
        return False

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument
        return False


admin.site.register(FinancialAidEmailAudit, FinancialAidEmailAuditAdmin)
