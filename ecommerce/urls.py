"""URLs for ecommerce"""
from django.conf.urls import url
from ecommerce.views import (
    CheckoutView,
    CouponsView,
    OrderFulfillmentView,
    UserCouponsView,
)

urlpatterns = [
    url(r'^api/v0/checkout/$', CheckoutView.as_view(), name='checkout'),
    url(r'^api/v0/coupons/$', CouponsView.as_view({'get': 'list'}), name='coupon-list'),
    url(
        r'^api/v0/coupons/(?P<code>[-\w.]+)?/users/$',
        UserCouponsView.as_view(),
        name='coupon-user-create',
    ),
    url(r'^api/v0/order_fulfillment/$', OrderFulfillmentView.as_view(), name='order-fulfillment'),
]
