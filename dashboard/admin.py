"""
Admin views for Dashboard
"""

from django.contrib import admin

from dashboard.models import ProgramEnrollment


class ProgramEnrollmentAdmin(admin.ModelAdmin):
    """ModelAdmin for ProgramEnrollment"""
    list_display = ('user', 'program',)
    list_filter = ('program', 'program__live',)
    raw_id_fields = ('user',)
    search_fields = (
        'user__username',
        'user__email',
    )

admin.site.register(ProgramEnrollment, ProgramEnrollmentAdmin)
