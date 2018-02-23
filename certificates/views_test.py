"""
Tests for certificate views
"""
# pylint: disable=redefined-outer-name

import pytest
from django.urls import reverse
from rest_framework import status

from micromasters.utils import is_subset_dict
from grades.factories import MicromastersCourseCertificateFactory, MicromastersProgramCertificateFactory
from cms.factories import CourseCertificateSignatoriesFactory, ProgramCertificateSignatoriesFactory


pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.django_db,
]


def certificate_url(certificate_hash):
    """Helper method to generate a certificate URL"""
    return reverse("certificate", kwargs=dict(certificate_hash=certificate_hash))


def program_certificate_url(certificate_hash):
    """Helper method to generate a certificate URL"""
    return reverse("program-certificate", kwargs=dict(certificate_hash=certificate_hash))


def test_bad_cert_hash_404(client):
    """Test that a request for a non-existent certificate results in a 404"""
    assert client.get(certificate_url('not-a-certificate-hash')).status_code == status.HTTP_404_NOT_FOUND
    assert client.get(program_certificate_url('not-a-certificate-hash')).status_code == status.HTTP_404_NOT_FOUND


def test_no_signatories_404(client):
    """Test that a 404 is returned for a request for a certificate that has no signatories set for the course"""
    certificate = MicromastersCourseCertificateFactory.create()
    assert client.get(certificate_url(certificate.hash)).status_code == status.HTTP_404_NOT_FOUND

    certificate = MicromastersProgramCertificateFactory.create()
    assert client.get(program_certificate_url(certificate.hash)).status_code == status.HTTP_404_NOT_FOUND


def test_valid_certificate_200(client):
    """Test that a request for a valid certificate with signatories results in a 200"""
    certificate = MicromastersCourseCertificateFactory.create()
    signatory = CourseCertificateSignatoriesFactory.create(course=certificate.final_grade.course_run.course)
    resp = client.get(certificate_url(certificate.hash))
    assert resp.status_code == status.HTTP_200_OK
    final_grade = certificate.final_grade
    assert is_subset_dict(
        {
            'certificate_hash': certificate.hash,
            'course_title': final_grade.course_run.course.title,
            'program_title': final_grade.course_run.course.program.title,
            'name': final_grade.user.profile.full_name,
            'signatories': [signatory],
            'certificate': certificate
        },
        resp.context_data
    )
    assert reverse('certificate', args=[certificate.hash]) in resp.content.decode('utf-8')


def test_valid_program_certificate_200(client):
    """Test that a request for a valid program certificate with signatories results in a 200"""
    certificate = MicromastersProgramCertificateFactory.create()
    signatory = ProgramCertificateSignatoriesFactory.create(program_page__program=certificate.program)
    resp = client.get(program_certificate_url(certificate.hash))
    assert resp.status_code == status.HTTP_200_OK
    assert is_subset_dict(
        {
            'certificate_hash': certificate.hash,
            'program_title': certificate.program.title,
            'name': certificate.user.profile.full_name,
            'signatories': [signatory],
            'certificate': certificate
        },
        resp.context_data
    )
    assert reverse('program-certificate', args=[certificate.hash]) in resp.content.decode('utf-8')
