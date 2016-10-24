"""project URL Configuration"""
from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin
from rest_framework import routers
from wagtail.wagtailadmin import urls as wagtailadmin_urls
from wagtail.wagtaildocs import urls as wagtaildocs_urls
from wagtail.wagtailcore import urls as wagtail_urls

from courses.views import (
    ProgramEnrollmentListView,
    ProgramViewSet,
)
from dashboard.views import (
    UserCourseEnrollment,
    UserDashboard,
)
from ecommerce.views import (
    CheckoutView,
    OrderFulfillmentView,
)
from financialaid.views import (
    FinancialAidActionView,
    FinancialAidDetailView,
    FinancialAidRequestView,
    FinancialAidSkipView,
    CoursePriceDetailView,
    CoursePriceListView
)
from profiles.views import ProfileViewSet
from search.views import ElasticProxyView
from mail.views import (
    FinancialAidMailView,
    SearchResultMailView
)

router = routers.DefaultRouter()
router.register(r'programs', ProgramViewSet)
router.register(r'profiles', ProfileViewSet)

urlpatterns = [
    url(r'', include('ui.urls')),
    url('', include('social.apps.django_app.urls', namespace='social')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/v0/', include(router.urls)),
    url(r'^api/v0/dashboard/$', UserDashboard.as_view(), name='dashboard_api'),
    url(r'^api/v0/search/(?P<elastic_url>.*)', ElasticProxyView.as_view(), name='search_api'),
    url(r'^api/v0/checkout/$', CheckoutView.as_view(), name='checkout'),
    url(r'^api/v0/enrolledprograms/$', ProgramEnrollmentListView.as_view(), name='user_program_enrollments'),
    url(r'^api/v0/course_enrollments/$', UserCourseEnrollment.as_view(), name='user_course_enrollments'),
    url(r'^api/v0/mail/$', SearchResultMailView.as_view(), name='search_result_mail_api'),
    url(r'^api/v0/financial_aid_mail/(?P<financial_aid_id>[\d]+)/$', FinancialAidMailView.as_view(),
        name='financial_aid_mail_api'),
    url(r'^api/v0/financial_aid_request/$', FinancialAidRequestView.as_view(), name='financial_aid_request'),
    url(r'^api/v0/financial_aid_action/(?P<financial_aid_id>[\d]+)/$', FinancialAidActionView.as_view(),
        name='financial_aid_action'),
    url(r'^api/v0/financial_aid_skip/(?P<program_id>[\d]+)/$',
        FinancialAidSkipView.as_view(), name='financial_aid_skip'),
    url(r'^api/v0/financial_aid/(?P<financial_aid_id>[\d]+)/$',
        FinancialAidDetailView.as_view(), name='financial_aid'),
    url(r'^api/v0/course_prices/$', CoursePriceListView.as_view(), name='course_price_list'),
    url(r'^api/v0/course_prices/(?P<program_id>[\d]+)/$',
        CoursePriceDetailView.as_view(), name='course_price_detail'),
    url(r'^api/v0/order_fulfillment/$', OrderFulfillmentView.as_view(), name='order-fulfillment'),
    url(r'^status/', include('server_status.urls')),
    url(r'^financial_aid/', include('financialaid.urls')),
    # Wagtail
    url(r'^cms/', include(wagtailadmin_urls)),
    url(r'^documents/', include(wagtaildocs_urls)),
    url(r'', include(wagtail_urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'ui.views.page_404'
handler500 = 'ui.views.page_500'
