"""Admin views for Mail app."""

from django.contrib import admin

from mail.models import PartnerSchool


@admin.register(PartnerSchool)
class PartnerSchoolAdmin(admin.ModelAdmin):
    """ModelAdmin for PartnerSchool."""

    list_display = ("name", "email")
    ordering = ("name", "email")
