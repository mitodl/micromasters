"""
Admin views for ecommerce models
"""

from django.contrib import admin

from ecommerce.models import (
    Coupon,
    CouponAudit,
    CouponInvoice,
    CouponInvoiceAudit,
    Line,
    Order,
    OrderAudit,
    Receipt,
    RedeemedCoupon,
    RedeemedCouponAudit,
    UserCoupon,
    UserCouponAudit,
)
from micromasters.utils import get_field_names


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
    list_filter = ('status',)
    list_display = ('id', 'user', 'status', 'created_at', 'course_key',)
    search_fields = (
        'user__username',
        'user__email',
    )

    readonly_fields = [name for name in get_field_names(Order) if name != 'status']

    def course_key(self, obj):
        """
        returns first course key associated with order
        """
        line = obj.line_set.first()
        return line.course_key

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


class CouponInvoiceAdmin(admin.ModelAdmin):
    """Admin for CouponInvoice"""
    model = CouponInvoice

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class CouponInvoiceAuditAdmin(admin.ModelAdmin):
    """Admin for CouponInvoiceAudit"""
    model = CouponInvoiceAudit
    readonly_fields = get_field_names(CouponInvoiceAudit)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class CouponAdmin(admin.ModelAdmin):
    """Admin for Coupon"""
    model = Coupon
    search_fields = (
        'coupon_code',
        'invoice__invoice_number',
        'invoice__description',
    )
    list_filter = [
        'invoice',
        'enabled',
        'coupon_type',
        'amount_type',
    ]

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class CouponAuditAdmin(admin.ModelAdmin):
    """Admin for CouponAudit"""
    model = CouponAudit
    readonly_fields = get_field_names(CouponAudit)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class RedeemedCouponAdmin(admin.ModelAdmin):
    """Admin for RedeemedCoupon"""
    model = RedeemedCoupon
    readonly_fields = get_field_names(RedeemedCoupon)

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class RedeemedCouponAuditAdmin(admin.ModelAdmin):
    """Admin for RedeemedCouponAudit"""
    model = RedeemedCouponAudit
    readonly_fields = get_field_names(RedeemedCouponAudit)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class UserCouponAdmin(admin.ModelAdmin):
    """Admin for UserCoupon"""
    model = UserCoupon
    readonly_fields = get_field_names(UserCoupon)

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class UserCouponAuditAdmin(admin.ModelAdmin):
    """Admin for UserCouponAudit"""
    model = UserCouponAudit
    readonly_fields = get_field_names(UserCouponAudit)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(CouponInvoice, CouponInvoiceAdmin)
admin.site.register(CouponInvoiceAudit, CouponInvoiceAuditAdmin)
admin.site.register(Coupon, CouponAdmin)
admin.site.register(CouponAudit, CouponAuditAdmin)
admin.site.register(Line, LineAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(OrderAudit, OrderAuditAdmin)
admin.site.register(RedeemedCoupon, RedeemedCouponAdmin)
admin.site.register(RedeemedCouponAudit, RedeemedCouponAuditAdmin)
admin.site.register(Receipt, ReceiptAdmin)
admin.site.register(UserCoupon, UserCouponAdmin)
admin.site.register(UserCouponAudit, UserCouponAuditAdmin)
