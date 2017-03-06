"""
Tests for search API functionality
"""
import math
from unittest.mock import Mock, patch
from elasticsearch_dsl import Search, Q
from factory.django import mute_signals
from django.test import (
    override_settings,
)
from django.db.models.signals import post_save
from django.conf import settings

from courses.factories import ProgramFactory
from dashboard.factories import ProgramEnrollmentFactory
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import Staff
from search.api import (
    execute_search,
    create_search_obj,
    prepare_and_execute_search,
    get_all_query_matching_emails,
)
from search.base import ESTestCase
from search.connection import DOC_TYPES
from search.exceptions import NoProgramAccessException


class FakeEmailSearchHits:
    """
    Mocks an elasticsearch_dsl.result.Response object
    """
    total = 5
    results = [
        Mock(email=['a@example.com']),
        Mock(email=['b@example.com']),
        Mock(email=['c@example.com']),
        Mock(email=['b@example.com'])
    ]

    def __iter__(self):
        return iter(self.results)


def create_fake_search_result(hits_cls):
    """
    Creates a fake elasticsearch_dsl.result.Response object
    """
    return Mock(hits=hits_cls())


class SearchAPITests(ESTestCase):  # pylint: disable=missing-docstring
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        cls.user = profile.user
        cls.program = ProgramFactory.create()
        Role.objects.create(
            user=cls.user,
            program=cls.program,
            role=Staff.ROLE_ID
        )

        with mute_signals(post_save):
            profile = ProfileFactory.create(email_optin=True, filled_out=True)
            profile2 = ProfileFactory.create(email_optin=False, filled_out=True)

        cls.learner = profile.user
        cls.learner2 = profile2.user

        # self.user with role staff on program
        for user in [cls.learner, cls.learner2, cls.user]:
            ProgramEnrollmentFactory(
                user=user,
                program=cls.program,
            )

    def test_execute_search(self):
        """
        Test that the execute_search method invokes the right method on the Search object
        """
        search_obj = Search()
        search_obj.execute = Mock(name='execute')
        with patch('search.api.get_conn', autospec=True) as mock_get_conn:
            execute_search(search_obj)
            assert search_obj.execute.called
            assert mock_get_conn.called

    def test_create_search_obj_filter(self):
        """
        Test that Search objects are created with program-limiting and filled_out=True query parameters
        """
        search_obj = create_search_obj(self.user)
        search_query_dict = search_obj.to_dict()
        expected_program_query = Q(
            'bool',
            should=[
                Q('term', **{'program.id': self.program.id})
            ],
            minimum_should_match=1,
            must=[
                Q('term', **{'program.is_learner': True})
            ]
        )
        expected_filled_out_query = Q('term', **{'profile.filled_out': True})
        assert 'query' in search_query_dict
        assert 'bool' in search_query_dict['query']
        assert 'filter' in search_query_dict['query']['bool']
        assert len(search_query_dict['query']['bool']['filter']) == 2
        assert search_query_dict['query']['bool']['filter'] == [
            expected_program_query.to_dict(),
            expected_filled_out_query.to_dict(),
        ]

    @override_settings(ELASTICSEARCH_DEFAULT_PAGE_SIZE=5)
    def test_size_param_in_query(self):
        """
        Assert value of size attribute of search object is set to default settings.
        """
        search_obj = create_search_obj(self.user)
        search_query_dict = search_obj.to_dict()
        assert 'size' in search_query_dict
        assert search_query_dict['size'] == 5

    def test_create_search_obj_metadata(self):
        """
        Test that Search objects are created with proper metadata
        """
        search_param_dict = {'size': 50}
        with patch('search.api.Search.update_from_dict', autospec=True) as mock_update_from_dict:
            search_obj = create_search_obj(self.user, search_param_dict=search_param_dict)
        assert search_obj._doc_type == list(DOC_TYPES)  # pylint: disable=protected-access
        assert search_obj._index == [settings.ELASTICSEARCH_INDEX]  # pylint: disable=protected-access
        mock_update_from_dict.assert_called_with(search_obj, search_param_dict)

    def test_user_with_no_program_access(self):
        """
        Test that a user with no program permissions will raise an exception
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        with self.assertRaises(NoProgramAccessException):
            create_search_obj(profile.user)

    def test_prepare_and_execute_search(self):
        """
        Test that a Search object is properly prepared and executed
        """
        mock_search_func = Mock(name='execute', return_value=['result1', 'result2'])
        params = {'size': 50}
        with patch('search.api.create_search_obj', autospec=True, return_value=None) as mock_create_search_obj:
            results = prepare_and_execute_search(
                self.user,
                search_param_dict=params,
                search_func=mock_search_func,
                filter_on_email_optin=True
            )
            mock_create_search_obj.assert_called_with(
                self.user,
                search_param_dict=params,
                filter_on_email_optin=True
            )
            assert results == ['result1', 'result2']

    def test_search_user(self):
        """
        Assert learner in search result and staff excluded
        """
        params = {'size': 50}
        results = prepare_and_execute_search(self.user, search_param_dict=params)

        self.assertEqual(len(results), 2)
        self.assertListEqual(
            sorted([results[0].user_id, results[1].user_id]),
            [self.learner.id, self.learner2.id]
        )
        self.assertTrue(results[0].program.is_learner)
        self.assertTrue(results[1].program.is_learner)

    def test_search_user_on_email_optin_filter(self):
        """
        when filter_on_email_optin is enable.
        """
        params = {'size': 50}
        results = prepare_and_execute_search(
            self.user,
            search_param_dict=params,
            filter_on_email_optin=True
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].user_id, self.learner.id)
        self.assertTrue(results[0].program.is_learner)
        self.assertTrue(results[0].profile.email_optin)

    def test_all_query_matching_emails(self):
        """
        Test that a set of search results will yield an expected set of emails
        """
        fake_search_result = create_fake_search_result(FakeEmailSearchHits)
        mock_execute_search = Mock(spec=execute_search, return_value=fake_search_result)
        test_es_page_size = 2
        with patch('search.api.execute_search', mock_execute_search):
            results = get_all_query_matching_emails(Search(), page_size=test_es_page_size)
            assert results == set([result.email[0] for result in fake_search_result.hits.results])
            assert mock_execute_search.call_count == math.ceil(fake_search_result.hits.total/test_es_page_size)
            # Assert that the Search object is limited to return only the email field
            args, _ = mock_execute_search.call_args  # pylint: disable=unpacking-non-sequence
            assert args[0].to_dict()['fields'] == 'email'
