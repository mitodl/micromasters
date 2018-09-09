"""
Admin site bindings for profiles
"""

from django.contrib import admin

from .models import Profile


class ProfileAdmin(admin.ModelAdmin):
    """Admin for Profile"""
    model = Profile
    list_display = [
        'user',
        'first_name',
        'last_name',
        'email_optin',
    ]
    search_fields = [
        'user__username',
        'user__email',
        'first_name',
        'last_name',
    ]
    list_filter = [
        'email_optin',
        'user__is_active',
    ]
    raw_id_fields = ('user',)

admin.site.register(Profile, ProfileAdmin)
