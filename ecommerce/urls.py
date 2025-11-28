"""URLs for ecommerce"""
from django.urls import path, re_path

from ecommerce.views import (CheckoutView, CouponsView, OrderFulfillmentView,
                             PaymentCallBackView, UserCouponsView)

urlpatterns = [
    path('api/v0/checkout/', CheckoutView.as_view(), name='checkout'),
    path('api/v0/coupons/', CouponsView.as_view({'get': 'list'}), name='coupon-list'),
    re_path(
        r'^api/v0/coupons/(?P<code>[-\w.]+)?/users/$',
        UserCouponsView.as_view(),
        name='coupon-user-create',
    ),
    path('api/v0/order_fulfillment/', OrderFulfillmentView.as_view(), name='order-fulfillment'),
    path('payment-callback/', PaymentCallBackView.as_view(), name='payment-callback'),
]
