"""
URLs for financialaid
Note: Built using Django forms rather than API endpoints with React for development speed
    See https://github.com/mitodl/micromasters/issues/1045#issuecomment-247406542
"""
from django.conf.urls import url

from financialaid.views import (
    CoursePriceListView,
    CoursePriceDetailView,
    FinancialAidActionView,
    FinancialAidDetailView,
    FinancialAidRequestView,
    FinancialAidSkipView,
    ReviewFinancialAidView,
)

urlpatterns = [
    url(r'^api/v0/course_prices/$', CoursePriceListView.as_view(), name='course_price_list'),
    url(r'^api/v0/course_prices/(?P<program_id>[\d]+)/$',
        CoursePriceDetailView.as_view(), name='course_price_detail'),
    url(
        r'^financial_aid/review/(?P<program_id>[\d]+)/?$',
        ReviewFinancialAidView.as_view(),
        name='review_financial_aid',
    ),
    url(
        r'^financial_aid/review/(?P<program_id>[\d]+)/(?P<status>[\w-]+)/?$',
        ReviewFinancialAidView.as_view(),
        name='review_financial_aid',
    ),
    url(r'^api/v0/financial_aid_request/$', FinancialAidRequestView.as_view(), name='financial_aid_request'),
    url(r'^api/v0/financial_aid_action/(?P<financial_aid_id>[\d]+)/$', FinancialAidActionView.as_view(),
        name='financial_aid_action'),
    url(r'^api/v0/financial_aid_skip/(?P<program_id>[\d]+)/$',
        FinancialAidSkipView.as_view(), name='financial_aid_skip'),
    url(r'^api/v0/financial_aid/(?P<financial_aid_id>[\d]+)/$',
        FinancialAidDetailView.as_view(), name='financial_aid'),
]
