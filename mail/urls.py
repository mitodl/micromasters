"""URLs for mail app"""
from django.conf.urls import url, include
from rest_framework import routers

from mail.views import (
    LearnerMailView,
    FinancialAidMailView,
    SearchResultMailView,
    CourseTeamMailView,
    AutomaticEmailView,
    EmailBouncedView,
)

router = routers.DefaultRouter()
router.register(r'automatic_email', AutomaticEmailView, base_name='automatic_email_api')

urlpatterns = [
    url(r'^api/v0/financial_aid_mail/(?P<financial_aid_id>[\d]+)/$', FinancialAidMailView.as_view(),
        name='financial_aid_mail_api'),
    url(r'^api/v0/mail/search/$', SearchResultMailView.as_view(), name='search_result_mail_api'),
    url(r'^api/v0/mail/course/(?P<course_id>[\d]+)/$', CourseTeamMailView.as_view(), name='course_team_mail_api'),
    url(r'^api/v0/mail/learner/(?P<student_id>[\d]+)/$', LearnerMailView.as_view(), name='learner_mail_api'),
    url(r'^api/v0/mail/bounce_event/$', EmailBouncedView.as_view(), name='email_bounced_view'),
    url(r'^api/v0/mail/', include(router.urls)),
]
