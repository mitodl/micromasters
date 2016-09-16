"""
URLs for financialaid
Note: Built using Django forms rather than API endpoints with React for development speed
    See https://github.com/mitodl/micromasters/issues/1045#issuecomment-247406542
"""
from django.conf.urls import url

from financialaid.views import ReviewFinancialAidView

urlpatterns = [
    url(r'^review/?$', ReviewFinancialAidView.as_view(), name='review_financial_aid'),
    url(r'^review/(?P<status>[\w-]+)/?$', ReviewFinancialAidView.as_view(), name='review_financial_aid'),
    url(r'^review/(?P<status>[\w-]+)/(?P<sort_field>[\w-]+)?$', ReviewFinancialAidView.as_view(),
        name='review_financial_aid'),
]
