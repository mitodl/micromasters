"""
Admin views for Roles
"""

from django.contrib import admin

from roles.models import Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """ModelAdmin for Roles"""
    list_display = ('user', 'program', 'role', )
    raw_id_fields = ('user', )
