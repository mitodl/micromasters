"""
Admin views for ecommerce models
"""

from django.contrib import admin

from ecommerce.models import CoursePrice


class CoursePriceAdmin(admin.ModelAdmin):
    """Admin for CoursePrice"""
    model = CoursePrice

admin.site.register(CoursePrice, CoursePriceAdmin)
