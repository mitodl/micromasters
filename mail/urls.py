"""URLs for mail app"""
from django.conf.urls import url

from mail.views import (
    FinancialAidMailView,
    SearchResultMailView,
)

urlpatterns = [
    url(r'^api/v0/financial_aid_mail/(?P<financial_aid_id>[\d]+)/$', FinancialAidMailView.as_view(),
        name='financial_aid_mail_api'),
    url(r'^api/v0/mail/$', SearchResultMailView.as_view(), name='search_result_mail_api'),
]
