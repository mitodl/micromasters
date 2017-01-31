"""
Tests for the search view
"""
import ddt
from django.conf import settings
from django.core.urlresolvers import reverse
from django.db.models.signals import post_save
from django.test import override_settings
from factory.django import mute_signals
from rest_framework import status
from rest_framework.test import APITestCase

from courses.factories import ProgramFactory
from dashboard.factories import ProgramEnrollmentFactory
from dashboard.models import ProgramEnrollment
from micromasters.factories import UserFactory
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import (
    Instructor,
    Staff,
)
from search.base import ESTestCase


@ddt.ddt
class SearchTests(ESTestCase, APITestCase):
    """Tests for the search api view"""

    @classmethod
    def setUpTestData(cls):
        super(SearchTests, cls).setUpTestData()
        # create some students
        with mute_signals(post_save):
            cls.students = [(ProfileFactory.create(filled_out=True)).user for _ in range(30)]
        # create the programs
        cls.program1 = ProgramFactory.create(live=True)
        cls.program2 = ProgramFactory.create(live=True)
        cls.program3 = ProgramFactory.create(live=True)

        # enroll the users in the programs
        for num, student in enumerate(cls.students):
            if num % 3 == 0:
                program = cls.program1
            elif num % 3 == 1:
                program = cls.program2
            else:
                program = cls.program3
            ProgramEnrollmentFactory.create(
                user=student,
                program=program
            )

        # create an user with a role for one program
        cls.staff = UserFactory.create()
        Role.objects.create(
            user=cls.staff,
            program=cls.program1,
            role=Staff.ROLE_ID
        )

        # search URL
        cls.search_url = reverse('search_api', kwargs={'elastic_url': ''})

    def setUp(self):
        super(SearchTests, self).setUp()
        self.client.force_login(self.staff)

    @override_settings(ELASTICSEARCH_DEFAULT_PAGE_SIZE=1000)
    def assert_status_code(self, status_code=status.HTTP_200_OK, json=None):
        """
        Helper function to assert the status code for POST
        """
        resp_post = self.client.post(self.search_url, json, format='json')
        assert resp_post.status_code == status_code
        return resp_post

    def get_user_ids_in_hits(self, hits):
        """
        Helper function to extract profile ids from elasticsearch hits
        """
        return [hit['_source']['user_id'] for hit in hits]

    def get_program_ids_in_hits(self, hits):
        """
        Helper function to extract the program ids in a list of elasticsearch hits.
        """
        return list(set(hit['_source']['program']['id'] for hit in hits))

    def test_default_page_size(self):
        """Assert the default page size"""
        assert settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE == 50

    def test_no_anonymous_access(self):
        """
        Anonymous users do not have access
        """
        self.client.logout()
        self.assert_status_code(status.HTTP_403_FORBIDDEN)

    def test_normal_user_does_not_have_access(self):
        """Normal user without role cannot access"""
        user = UserFactory.create()
        self.client.force_login(user)
        self.assert_status_code(status.HTTP_403_FORBIDDEN)

    @ddt.data(
        Staff.ROLE_ID,
        Instructor.ROLE_ID,
    )
    def test_staff_and_instructor_can_access(self, role):
        """A user with staff or instructor role can access"""
        user = UserFactory.create()
        Role.objects.create(
            user=user,
            program=self.program1,
            role=role,
        )
        self.client.force_login(user)
        self.assert_status_code()

    def test_require_access_to_program(self):
        """A user must be staff or instructor of some program"""
        # user is superuser so they have all permissions, but they are still not staff or instructor
        user = UserFactory.create(is_superuser=True)
        self.client.force_login(user)
        self.assert_status_code(status_code=status.HTTP_403_FORBIDDEN)

    def test_proxy_woks(self):
        """
        Test the proxy actually returns something
        """
        resp = self.assert_status_code()
        assert 'hits' in resp.data
        assert 'hits' in resp.data['hits']
        assert len(resp.data['hits']['hits']) > 0
        assert isinstance(resp.data['hits']['hits'][0], dict)

    def test_user_visibility(self):
        """
        Test that the user with the role can see only users belonging to the
        programs where she is power user
        """
        resp = self.assert_status_code()
        hits = resp.data['hits']['hits']
        for hit in hits:
            assert '_source' in hit
            assert 'program' in hit['_source']
            assert 'id' in hit['_source']['program']
            assert hit['_source']['program']['id'] == self.program1.id

    def test_limits_work_with_filters(self):
        """
        Test that if the user sends a query that filter by a subset
        of the programs she has power access, the filter in the rest api does not add unwanted
        results.
        """
        # enroll the user in another program
        Role.objects.create(
            user=self.staff,
            program=self.program3,
            role=Staff.ROLE_ID
        )
        # verify that by default the user sees all the users programs she has access to
        resp = self.assert_status_code()
        program_ids_in_hits = self.get_program_ids_in_hits(resp.data['hits']['hits'])
        assert len(program_ids_in_hits) == 2
        assert self.program1.id in program_ids_in_hits
        assert self.program3.id in program_ids_in_hits

        # request just users in one program with filters and query
        wanted_program_id = self.program3.id

        filter_params = {
            "filter": {
                "bool": {
                    "should": [
                        {"term": {"program.id": wanted_program_id}}
                    ]
                }
            }
        }
        query_params = {
            "query": {
                "bool": {
                    "should": [
                        {"term": {"program.id": wanted_program_id}}
                    ]
                }
            }
        }
        for params in [filter_params, query_params]:
            # verify that only the wanted program is in the hits
            resp = self.assert_status_code(json=params)
            program_ids_in_hits = self.get_program_ids_in_hits(resp.data['hits']['hits'])
            assert len(program_ids_in_hits) == 1
            assert program_ids_in_hits[0] == wanted_program_id

    @override_settings(ELASTICSEARCH_DEFAULT_PAGE_SIZE=1000)
    def test_filled_out(self):
        """
        Search results should only include profiles which are filled out
        """
        program = self.program1
        filled_out_ids = list(ProgramEnrollment.objects.filter(program=program).values_list('user_id', flat=True))
        enrollment_not_filled_out = ProgramEnrollmentFactory.create(
            user__profile__filled_out=False,
            program=program,
        )

        resp = self.assert_status_code()
        user_ids_in_hits = self.get_user_ids_in_hits(resp.data['hits']['hits'])
        assert sorted(user_ids_in_hits) == sorted(filled_out_ids)
        assert enrollment_not_filled_out.user.id not in user_ids_in_hits
