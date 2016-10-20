"""
Tests for the search view
"""
from django.core.urlresolvers import reverse
from django.db.models.signals import post_save
from factory.django import mute_signals
from rest_framework import status
from rest_framework.test import APITestCase

from courses.factories import ProgramFactory
from dashboard.factories import ProgramEnrollmentFactory
from micromasters.factories import UserFactory
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import Staff
from search.base import ESTestCase


class SearchTests(ESTestCase, APITestCase):
    """Tests for the search api view"""

    @classmethod
    def setUpTestData(cls):
        super(SearchTests, cls).setUpTestData()
        # create some students
        with mute_signals(post_save):
            cls.students = [(ProfileFactory.create()).user for _ in range(30)]
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
        # create another user without any role
        cls.user = UserFactory.create()

        # search URL
        cls.search_url = reverse('search_api', kwargs={'elastic_url': ''})

    def setUp(self):
        super(SearchTests, self).setUp()
        self.client.force_login(self.staff)

    def assert_status_code(self, status_code=status.HTTP_200_OK, json=None):
        """
        Helper function to assert the status code for POST and GET
        """
        if json is None:
            json = {}
        resp_get = self.client.get(self.search_url)
        assert resp_get.status_code == status_code
        resp_post = self.client.post(self.search_url, json, format='json')
        assert resp_post.status_code == status_code
        return resp_get, resp_post

    def get_program_ids_in_hits(self, hits):  # pylint: disable=no-self-use
        """
        Helper function to extract the program ids in a list of elasticsearch hits.
        """
        return list(set(hit['_source']['program']['id'] for hit in hits))

    def test_access(self):
        """
        Test access with different user types
        """
        self.client.logout()
        # anonymous user cannot access
        self.assert_status_code(status.HTTP_403_FORBIDDEN)
        # normal user without role cannot access
        self.client.force_login(self.user)
        self.assert_status_code(status.HTTP_403_FORBIDDEN)
        # user with role can access
        self.client.force_login(self.staff)
        self.assert_status_code()

    def test_proxy_woks(self):
        """
        Test the proxy actually returns something
        """
        resp, _ = self.assert_status_code()
        assert 'hits' in resp.data
        assert 'hits' in resp.data['hits']
        assert len(resp.data['hits']['hits']) > 0
        assert isinstance(resp.data['hits']['hits'][0], dict)

    def test_get_post_equivalent(self):
        """
        Get and post return the same result for the same query
        """
        resp_get, resp_post = self.assert_status_code()
        assert len(resp_get.data['hits']['hits']) == len(resp_post.data['hits']['hits'])
        hits_get = resp_get.data['hits']['hits']
        hits_post = resp_post.data['hits']['hits']
        hits_get.sort(key=lambda x: x['_id'])
        hits_post.sort(key=lambda x: x['_id'])
        for get_item, post_item in zip(hits_get, hits_post):
            assert get_item == post_item

    def test_user_visibility(self):
        """
        Test that the user with the role can see only users belonging to the
        programs where she is power user
        """
        resp, _ = self.assert_status_code()
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
        resp, _ = self.assert_status_code()
        program_ids_in_hits = self.get_program_ids_in_hits(resp.data['hits']['hits'])
        assert len(program_ids_in_hits) == 2
        assert self.program1.id in program_ids_in_hits
        assert self.program3.id in program_ids_in_hits

        # request just users in one program
        wanted_program_id = self.program3.id
        filter_data = {
            "query": {
                "bool": {
                    "should": [
                        {"term": {"program.id": wanted_program_id}}
                    ]
                }
            }
        }
        # verify that only the wanted program is in the hits
        _, resp = self.assert_status_code(json=filter_data)
        program_ids_in_hits = self.get_program_ids_in_hits(resp.data['hits']['hits'])
        assert len(program_ids_in_hits) == 1
        assert program_ids_in_hits[0] == wanted_program_id
