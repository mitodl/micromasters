"""project URL Configuration"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls

from cms.views import (cms_password_reset_redirect_to_site_signin,
                       cms_signin_redirect_to_site_signin)

urlpatterns = []

if settings.DEBUG and 'debug_toolbar' in settings.INSTALLED_APPS:
    import debug_toolbar  # pylint: disable=wrong-import-position, wrong-import-order

    # these urls need to be here (or before wagtail anyway)
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    ]

urlpatterns += [
    path('', include('backends.urls')),
    re_path(r'^admin/', admin.site.urls),
    path('', include('courses.urls')),
    path("", include("cms.urls")),
    path('', include('dashboard.urls')),
    path('', include('ecommerce.urls')),
    path('', include('financialaid.urls')),
    path('', include('search.urls')),
    path('', include('mail.urls')),
    path('', include('profiles.urls')),
    path('', include('ui.urls')),

    # Django Robots
    path("robots.txt", include("robots.urls")),

    # Hijack
    path('hijack/', include('hijack.urls', namespace='hijack')),
    # Wagtail
    re_path(r'^cms/login/', cms_signin_redirect_to_site_signin, name='wagtailadmin_login'),
    re_path(r'^cms/password_reset/', cms_password_reset_redirect_to_site_signin, name='wagtailadmin_password_reset'),
    path('cms/', include(wagtailadmin_urls)),
    path('documents/', include(wagtaildocs_urls)),
    path('', include(wagtail_urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'ui.views.page_404'
handler500 = 'ui.views.page_500'
