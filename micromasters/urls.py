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
    CourseRunViewSet,
    ProgramEnrollmentListView,
    ProgramViewSet,
)
from dashboard.views import UserDashboard
from ecommerce.views import (
    CheckoutView,
    OrderFulfillmentView,
)
from financialaid.views import IncomeValidationView
from profiles.views import ProfileViewSet
from search.views import ElasticProxyView
from mail.views import MailView

router = routers.DefaultRouter()
router.register(r'programs', ProgramViewSet)
router.register(r'courses', CourseRunViewSet)
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
    url(r'^api/v0/mail/$', MailView.as_view(), name='mail_api'),
    url(r'^api/v0/financialaid/$', IncomeValidationView.as_view(), name='financialaid_api'),
    url(r'^api/v0/order_fulfillment/$', OrderFulfillmentView.as_view(), name='order-fulfillment'),
    url(r'^status/', include('server_status.urls')),
    # Wagtail
    url(r'^cms/', include(wagtailadmin_urls)),
    url(r'^documents/', include(wagtaildocs_urls)),
    url(r'', include(wagtail_urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'ui.views.page_404'
handler500 = 'ui.views.page_500'
