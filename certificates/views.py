"""
Views for MicroMasters-generated certificates
"""

import json
import logging
from django.conf import settings
from django.views.generic import TemplateView
from rest_framework.generics import Http404

from cms.models import CourseCertificateSignatories, ProgramCertificateSignatories
from grades.models import MicromastersCourseCertificate, MicromastersProgramCertificate

log = logging.getLogger(__name__)


class CertificateView(TemplateView):
    """
    Abstract view for certificate
    """
    class Meta:
        abstract = True

    template_name = 'certificate.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "reactGaDebug": settings.REACT_GA_DEBUG,
            "edx_base_url": settings.EDXORG_BASE_URL,
        }
        context["js_settings_json"] = json.dumps(js_settings)

        return context


class CourseCertificateView(CertificateView):  # pylint: disable=unused-argument
    """
    Views for course certificates
    """

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        certificate = (
            MicromastersCourseCertificate.objects.filter(hash=kwargs.get('certificate_hash')).
            select_related('course__program', 'user__profile').
            first()
        )
        if not certificate:
            raise Http404

        course = certificate.course
        signatories = CourseCertificateSignatories.objects.filter(course=course).all()
        if len(signatories) == 0:
            log.error(
                'Course "%s" (id: %s) does not have any signatories set in the CMS.', course.title, course.id
            )
            raise Http404

        context['course_title'] = course.title
        context['program_title'] = course.program.title
        context['name'] = certificate.user.profile.full_name
        context['signatories'] = list(signatories)
        context['certificate'] = certificate

        return context


class ProgramCertificateView(CertificateView):
    """
    Views for program certificates
    """

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        certificate = (
            MicromastersProgramCertificate.objects.filter(hash=kwargs.get('certificate_hash')).
            select_related('program', 'user__profile').
            first()
        )
        if not certificate:
            raise Http404
        program = certificate.program

        signatories = ProgramCertificateSignatories.objects.filter(program_page__program=program)
        if not signatories.exists():
            log.error(
                'Program "%s" (id: %s) does not have any signatories set in the CMS.',
                program.title,
                program.id
            )
            raise Http404

        context['program_title'] = program.title
        context['name'] = certificate.user.profile.full_name
        context['signatories'] = list(signatories)
        context['certificate'] = certificate

        return context
