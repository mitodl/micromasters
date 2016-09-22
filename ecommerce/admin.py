"""
Admin views for ecommerce models
"""

from django.contrib import admin

from ecommerce.models import (
    CoursePrice,
    Line,
    Order,
    Receipt,
)


class CoursePriceAdmin(admin.ModelAdmin):
    """Admin for CoursePrice"""
    model = CoursePrice


class LineAdmin(admin.ModelAdmin):
    """Admin for Line"""
    model = Line

    readonly_fields = Line._meta.get_all_field_names()  # pylint: disable=protected-access

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class OrderAdmin(admin.ModelAdmin):
    """Admin for Order"""
    model = Order

    readonly_fields = Order._meta.get_all_field_names()  # pylint: disable=protected-access

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class ReceiptAdmin(admin.ModelAdmin):
    """Admin for Receipt"""
    model = Receipt
    readonly_fields = Receipt._meta.get_all_field_names()  # pylint: disable=protected-access

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(CoursePrice, CoursePriceAdmin)
admin.site.register(Line, LineAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(Receipt, ReceiptAdmin)
