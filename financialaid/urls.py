"""
URLs for financialaid
Note: Built using Django forms rather than API endpoints with React for development speed
    See https://github.com/mitodl/micromasters/issues/1045#issuecomment-247406542
"""
from django.conf.urls import url

from financialaid.views import (
    CoursePriceListView,
    FinancialAidActionView,
    FinancialAidDetailView,
    FinancialAidRequestView,
    FinancialAidSkipView,
    ReviewFinancialAidView,
)
from profiles.constants import USERNAME_RE_PARTIAL

urlpatterns = [
    url(fr'^api/v0/course_prices/(?P<username>{USERNAME_RE_PARTIAL})/$', CoursePriceListView.as_view(), name='course_price_list'),
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
