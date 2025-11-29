"""project URL Configuration"""
from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls
from wagtail.core import urls as wagtail_urls

from cms.views import (
    cms_signin_redirect_to_site_signin,
    cms_password_reset_redirect_to_site_signin
)

urlpatterns = []

if settings.DEBUG:
    import debug_toolbar  # pylint: disable=wrong-import-position, wrong-import-order
    # these urls need to be here (or before wagtail anyway)
    urlpatterns += [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ]

urlpatterns += [
    url(r'', include('backends.urls')),
    url(r'^admin/', admin.site.urls),
    url('', include('courses.urls')),
    url("", include("cms.urls")),
    url('', include('dashboard.urls')),
    url('', include('ecommerce.urls')),
    url('', include('financialaid.urls')),
    url('', include('search.urls')),
    url('', include('mail.urls')),
    url('', include('profiles.urls')),
    url(r'^status/', include('server_status.urls')),
    url('', include('ui.urls')),

    # Django Robots
    url("robots.txt", include("robots.urls")),

    # Hijack
    url(r'^hijack/', include('hijack.urls', namespace='hijack')),
    # Wagtail
    url(r'^cms/login/', cms_signin_redirect_to_site_signin, name='wagtailadmin_login'),
    url(r'^cms/password_reset/', cms_password_reset_redirect_to_site_signin, name='wagtailadmin_password_reset'),
    url(r'^cms/', include(wagtailadmin_urls)),
    url(r'^documents/', include(wagtaildocs_urls)),
    url('', include(wagtail_urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'ui.views.page_404'
handler500 = 'ui.views.page_500'
