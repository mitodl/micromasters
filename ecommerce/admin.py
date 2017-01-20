"""
Admin views for ecommerce models
"""

from django.contrib import admin

from ecommerce.models import (
    Coupon,
    CoursePrice,
    Line,
    Order,
    OrderAudit,
    Receipt,
    RedeemedCoupon,
)
from micromasters.utils import get_field_names


class CoursePriceAdmin(admin.ModelAdmin):
    """Admin for CoursePrice"""
    model = CoursePrice


class LineAdmin(admin.ModelAdmin):
    """Admin for Line"""
    model = Line

    readonly_fields = get_field_names(Line)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class OrderAdmin(admin.ModelAdmin):
    """Admin for Order"""
    model = Order

    readonly_fields = [name for name in get_field_names(Order) if name != 'status']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class OrderAuditAdmin(admin.ModelAdmin):
    """Admin for OrderAudit"""
    model = OrderAudit
    readonly_fields = get_field_names(OrderAudit)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class ReceiptAdmin(admin.ModelAdmin):
    """Admin for Receipt"""
    model = Receipt
    readonly_fields = get_field_names(Receipt)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class CouponAdmin(admin.ModelAdmin):
    """Admin for Coupon"""
    model = Coupon


class RedeemedCouponAdmin(admin.ModelAdmin):
    """Admin for RedeemedCoupon"""
    model = RedeemedCoupon
    readonly_fields = get_field_names(RedeemedCoupon)


admin.site.register(Coupon, CouponAdmin)
admin.site.register(CoursePrice, CoursePriceAdmin)
admin.site.register(Line, LineAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(OrderAudit, OrderAuditAdmin)
admin.site.register(RedeemedCoupon, RedeemedCouponAdmin)
admin.site.register(Receipt, ReceiptAdmin)
