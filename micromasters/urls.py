"""project URL Configuration"""
from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin
from rest_framework import routers
from wagtail.wagtailadmin import urls as wagtailadmin_urls
from wagtail.wagtaildocs import urls as wagtaildocs_urls
from wagtail.wagtailcore import urls as wagtail_urls

from courses.views import ProgramViewSet, CourseRunViewSet
from dashboard.views import UserDashboard
from profiles.views import ProfileViewSet

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
    url(r'^status/', include('server_status.urls')),

    # Wagtail
    url(r'^cms/', include(wagtailadmin_urls)),
    url(r'^documents/', include(wagtaildocs_urls)),
    url(r'', include(wagtail_urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'ui.views.page_404'
handler500 = 'ui.views.page_500'
