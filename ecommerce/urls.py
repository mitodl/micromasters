"""URLs for ecommerce"""
from django.conf.urls import url
from ecommerce.views import (
    CheckoutView,
    OrderFulfillmentView,
)

urlpatterns = [
    url(r'^api/v0/checkout/$', CheckoutView.as_view(), name='checkout'),
    url(r'^api/v0/order_fulfillment/$', OrderFulfillmentView.as_view(), name='order-fulfillment'),
]
