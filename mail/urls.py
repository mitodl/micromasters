"""URLs for mail app"""
from django.urls import include, path, re_path
from rest_framework import routers

from mail.views import (AutomaticEmailView, CourseTeamMailView,
                        FinancialAidMailView, GradesRecordMailView,
                        LearnerMailView, MailWebhookView, SearchResultMailView)

router = routers.DefaultRouter()
router.register(r'automatic_email', AutomaticEmailView, basename='automatic_email_api')

urlpatterns = [
    re_path(r'^api/v0/financial_aid_mail/(?P<financial_aid_id>[\d]+)/$', FinancialAidMailView.as_view(),
        name='financial_aid_mail_api'),
    path('api/v0/mail/search/', SearchResultMailView.as_view(), name='search_result_mail_api'),
    re_path(r'^api/v0/mail/course/(?P<course_id>[\d]+)/$', CourseTeamMailView.as_view(), name='course_team_mail_api'),
    re_path(r'^api/v0/mail/learner/(?P<student_id>[\d]+)/$', LearnerMailView.as_view(), name='learner_mail_api'),
    re_path(r'^api/v0/mail/grades/(?P<partner_id>[\d]+)/$', GradesRecordMailView.as_view(), name='grades_mail_api'),
    path('api/v0/mail/webhook/', MailWebhookView.as_view(), name='mailgun_webhook'),
    path('api/v0/mail/', include(router.urls)),
]
