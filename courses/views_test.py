"""Tests for the API"""

from unittest.mock import Mock

from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from courses.factories import ProgramFactory
from courses.serializers import ProgramSerializer
from dashboard.factories import ProgramEnrollmentFactory
from dashboard.models import ProgramEnrollment
from micromasters.factories import UserFactory
from search.base import MockedESTestCase


class ProgramTests(MockedESTestCase):
    """Tests for the Program API"""
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user = UserFactory.create()

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def test_lists_live_programs(self):
        """Live programs should show up"""
        prog = ProgramFactory.create(live=True)

        resp = self.client.get(reverse('program-list'))

        assert len(resp.json()) == 1
        context = {"request": Mock(user=self.user)}
        data = ProgramSerializer(prog, context=context).data
        assert [data] == resp.json()

    def test_doesnt_list_unlive_programs(self):
        """Not-live programs should NOT show up"""
        ProgramFactory.create(live=False)

        resp = self.client.get(reverse('program-list'))

        assert len(resp.json()) == 0


class ProgramEnrollmentTests(MockedESTestCase, APITestCase):
    """Tests for the ProgramEnrollment API"""

    @classmethod
    def setUpTestData(cls):
        super(ProgramEnrollmentTests, cls).setUpTestData()

        cls.user1 = UserFactory.create()
        cls.user2 = UserFactory.create()
        cls.program1 = ProgramFactory.create(live=True)
        cls.program2 = ProgramFactory.create(live=True)
        cls.program3 = ProgramFactory.create(live=True)

        cls.url = reverse('user_program_enrollments')

    def setUp(self):
        super(ProgramEnrollmentTests, self).setUp()
        self.default_enrollments = [
            ProgramEnrollmentFactory(
                user=self.user1,
                program=program,
            ) for program in (self.program1, self.program2,)
        ]
        self.client.force_login(self.user1)

    def tearDown(self):
        super(ProgramEnrollmentTests, self).tearDown()
        ProgramEnrollment.objects.all().delete()

    def assert_program_enrollments_count(self, expected_count=None):
        """Helper function to count the number of program enrollments"""
        if expected_count is None:
            expected_count = len(self.default_enrollments)
        count = ProgramEnrollment.objects.count()
        assert count == expected_count
        return count

    def test_anonymous(self):
        """Anonymous user cannot access the endpoint"""
        self.client.logout()
        resp = self.client.post(self.url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_no_enrollments(self):
        """Requests for a user with no program enrollments result in an empty list"""
        self.client.logout()
        self.client.force_login(self.user2)
        resp = self.client.get(self.url)
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_no_get_for_enrollments(self):
        """GET is not allowed for /api/v0/enrolledprograms/"""
        resp = self.client.get(self.url)
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_create_no_program_id(self):
        """Missing mandatory program_id parameter"""
        self.assert_program_enrollments_count()
        resp = self.client.post(self.url, {}, format='json')
        self.assert_program_enrollments_count()
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_invalid_program_id(self):
        """program_id parameter must be an integer"""
        self.assert_program_enrollments_count()
        resp = self.client.post(self.url, {'program_id': 'foo'}, format='json')
        self.assert_program_enrollments_count()
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_enrollment_exists(self):
        """Test in case the enrollment is already there"""
        self.assert_program_enrollments_count()
        resp = self.client.post(self.url, {'program_id': self.program1.pk}, format='json')
        self.assert_program_enrollments_count()
        assert resp.status_code == status.HTTP_200_OK
        self.assert_program_enrollments_count()

    def test_create_program_does_not_exists(self):
        """Test in case the program does not exist"""
        self.assert_program_enrollments_count()
        resp = self.client.post(self.url, {'program_id': 1234567}, format='json')
        self.assert_program_enrollments_count()
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_create_program_not_live(self):
        """Test in case the program is not live"""
        program = ProgramFactory.create(live=False)
        self.assert_program_enrollments_count()
        resp = self.client.post(self.url, {'program_id': program.pk}, format='json')
        self.assert_program_enrollments_count()
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_create(self):
        """Test for happy path"""
        count_before = self.assert_program_enrollments_count()
        resp = self.client.post(self.url, {'program_id': self.program3.pk}, format='json')
        self.assert_program_enrollments_count(count_before+1)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data.get('id') == self.program3.pk
