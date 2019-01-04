"""
Views for MicroMasters-generated certificates
"""

import json
import logging
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView
from rest_framework.generics import Http404

from cms.models import CourseCertificateSignatories, ProgramCertificateSignatories
from dashboard.api import get_certificate_url
from dashboard.models import ProgramEnrollment
from dashboard.utils import get_mmtrack
from grades.models import MicromastersCourseCertificate, MicromastersProgramCertificate, CombinedFinalGrade

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


class GradeRecordView(TemplateView):
    """
    View for grade records
    """

    template_name = 'grade_record.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "reactGaDebug": settings.REACT_GA_DEBUG,
            "edx_base_url": settings.EDXORG_BASE_URL,
        }
        context["js_settings_json"] = json.dumps(js_settings)

        enrollment = get_object_or_404(ProgramEnrollment, hash=kwargs.get('record_hash'))
        user = enrollment.user
        courses = enrollment.program.course_set.all()
        mmtrack = get_mmtrack(user, enrollment.program)
        combined_grade = CombinedFinalGrade.objects.filter(
            user=user,
            course__in=courses.values_list("id", flat=True)
        ).order_by("updated_on").last()
        context["program_title"] = enrollment.program.title
        context["program_status"] = "completed" if MicromastersProgramCertificate.objects.filter(
            user=user, program=enrollment.program).exists() else "partially"
        context["last_updated"] = combined_grade.updated_on if combined_grade else ""
        context["profile"] = {
            "username": user.username,
            "email": user.email,
            "full_name": user.profile.full_name
        }
        context['courses'] = []
        for course in courses:
            best_grade = mmtrack.get_best_final_grade_for_course(course)
            combined_grade = CombinedFinalGrade.objects.filter(user=user, course=course).first()
            context['courses'].append({
                "title": course.title,
                "edx_course_key": best_grade.course_run.edx_course_key if best_grade else "",
                "attempts": mmtrack.get_course_proctorate_exam_results(course).count(),
                "status": "Earned" if get_certificate_url(mmtrack, course) else "Not Earned",
                "date_earned": combined_grade.updated_on if combined_grade else "",
                "overall_grade": mmtrack.get_overall_final_grade_for_course(course)
            })

        return context
