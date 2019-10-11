"""Tests for the API"""

from unittest.mock import Mock

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from courses.catalog_serializers import CatalogProgramSerializer
from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from courses.serializers import ProgramSerializer, CourseRunSerializer
from dashboard.factories import ProgramEnrollmentFactory
from dashboard.models import ProgramEnrollment
from micromasters.factories import UserFactory
from micromasters.test_utils import assert_drf_json_equal
from profiles.models import Profile
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


def create_learner_with_image(privacy):
    """Helper function to create a user with account_privacy and image_small set"""
    user = UserFactory.create()
    user.profile.account_privacy = privacy
    user.profile.image_small = 'some_url'
    user.profile.save()
    return user


class ProgramLearnersTests(MockedESTestCase, APITestCase):
    """Tests for the ProgramLearners API"""

    @classmethod
    def setUpTestData(cls):

        super(ProgramLearnersTests, cls).setUpTestData()

        cls.program = ProgramFactory.create(live=True)
        cls.url = reverse('learners_in_program', kwargs={"program_id": cls.program.id})
        cls.user = create_learner_with_image(privacy=Profile.PUBLIC)

    def setUp(self):
        self.client.force_login(self.user)

    def create_learners_in_program(self, learners_count, privacy=Profile.PUBLIC):
        """helper function to create a list of learners in the program"""
        for _ in range(0, learners_count):
            user = create_learner_with_image(privacy)
            ProgramEnrollmentFactory.create(
                user=user,
                program=self.program,
            )

    def test_should_get_empty_list_if_only_one_learner(self):
        """
        should return empty list for learners if there are no other enrolled learners
        """

        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['learners_count'] == 0

    def test_should_return_only_eight_users(self):
        """
        should return total number of learners in the program
        and only eight of them in a list
        """
        self.create_learners_in_program(learners_count=10)
        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['learners_count'] == 10
        assert len(response.data['learners']) == 8

    def test_should_return_only_public_users(self):
        """
        should return only profiles that are not private
        """
        self.create_learners_in_program(learners_count=5, privacy=Profile.PRIVATE)
        self.create_learners_in_program(learners_count=5, privacy=Profile.PUBLIC_TO_MM)
        self.create_learners_in_program(learners_count=5)
        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['learners_count'] == 10


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


class CourseRunTests(MockedESTestCase, APITestCase):
    """Tests for CourseRun API"""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user = UserFactory.create()

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def test_lists_course_runs(self):
        """Course Runs should show up"""
        course_run = CourseRunFactory.create()
        resp = self.client.get(reverse('courserun-list'))

        assert len(resp.json()) == 1
        context = {"request": Mock(user=self.user)}
        data = CourseRunSerializer(course_run, context=context).data
        assert [data] == resp.json()


class CatalogTests(MockedESTestCase, APITestCase):
    """Tests for catalog API"""

    def test_lists_catalog(self):
        """Course Runs should show up"""
        program = ProgramFactory.create(live=True)
        for course in CourseFactory.create_batch(3, program=program):
            CourseRunFactory.create_batch(2, course=course)

        resp = self.client.get(reverse('catalog-list'))

        assert len(resp.json()) == 1
        data = CatalogProgramSerializer(program).data

        assert_drf_json_equal([data], resp.json())
