"""
Tests for search API functionality
"""
from unittest.mock import Mock, patch
import ddt
from elasticsearch_dsl import Search, Q
from factory.django import mute_signals
from django.test import (
    override_settings,
)
from django.db.models.signals import post_save

from courses.factories import ProgramFactory
from dashboard.factories import ProgramEnrollmentFactory
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import Staff
from search.api import (
    adjust_search_for_percolator,
    create_search_obj,
    document_needs_updating,
    execute_search,
    get_all_query_matching_emails,
    prepare_and_execute_search,
    search_for_field,
    search_percolate_queries,
)
from search.base import ESTestCase
from search.connection import (
    USER_DOC_TYPE,
    PUBLIC_USER_DOC_TYPE,
    get_default_alias,
)
from search.exceptions import (
    NoProgramAccessException,
    PercolateException,
)
from search.models import PercolateQuery


# pylint: disable=unused-argument
@ddt.ddt
class SearchAPITests(ESTestCase):
    """Tests for the search API"""
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
        search_obj = Search(index="index")
        search_obj.execute = Mock(name='execute')
        with patch('search.api.get_conn', autospec=True) as mock_get_conn:
            execute_search(search_obj)
            assert search_obj.execute.called
            assert mock_get_conn.called

    @ddt.data(True, False)
    def test_create_search_obj_filter(self, is_advance_search_capable):
        """
        Test that Search objects are created with program-limiting and filled_out=True query parameters
        """
        user = self.user if is_advance_search_capable else self.learner
        search_obj = create_search_obj(user)
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
        expected_privacy_query = ~Q('term', **{'profile.account_privacy': 'private'})
        assert 'query' in search_query_dict
        assert 'bool' in search_query_dict['query']
        assert 'filter' in search_query_dict['query']['bool']
        assert len(search_query_dict['query']['bool']['filter']) == 2 if is_advance_search_capable else 3
        expected_filters = [
            expected_program_query.to_dict(),
            expected_filled_out_query.to_dict(),
        ]
        if not is_advance_search_capable:
            expected_filters.insert(0, expected_privacy_query.to_dict())
        assert search_query_dict['query']['bool']['filter'] == expected_filters

    @override_settings(ELASTICSEARCH_DEFAULT_PAGE_SIZE=5)
    def test_size_param_in_query(self):
        """
        Assert value of size attribute of search object is set to default settings.
        """
        search_obj = create_search_obj(self.user)
        search_query_dict = search_obj.to_dict()
        assert 'size' in search_query_dict
        assert search_query_dict['size'] == 5

    @ddt.data(
        (True, [USER_DOC_TYPE]),
        (False, [PUBLIC_USER_DOC_TYPE]),
    )
    @ddt.unpack
    def test_create_search_obj_metadata(self, is_advance_search_capable, expected_doc_type):
        """
        Test that Search objects are created with proper metadata
        """
        user = self.user if is_advance_search_capable else self.learner
        search_param_dict = {'size': 50}
        with patch('search.api.Search.update_from_dict', autospec=True) as mock_update_from_dict:
            search_obj = create_search_obj(
                user,
                search_param_dict=search_param_dict,
            )
        assert search_obj._doc_type == expected_doc_type  # pylint: disable=protected-access
        assert search_obj._index == [get_default_alias()]  # pylint: disable=protected-access
        assert mock_update_from_dict.call_count == 2
        assert isinstance(mock_update_from_dict.call_args[0][0], Search)
        assert mock_update_from_dict.call_args[0][1] == search_param_dict

    def test_user_with_no_program_access(self):
        """
        Test that a user with no program permissions will raise an exception
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        with self.assertRaises(NoProgramAccessException):
            create_search_obj(profile.user)

    @ddt.data(True, False)
    def test_prepare_and_execute_search(self, is_advance_search_capable):
        """
        Test that a Search object is properly prepared and executed
        """
        user = self.user if is_advance_search_capable else self.learner
        mock_search_func = Mock(name='execute', return_value=['result1', 'result2'])
        params = {'size': 50}
        with patch('search.api.create_search_obj', autospec=True, return_value=None) as mock_create_search_obj:
            results = prepare_and_execute_search(
                user,
                search_param_dict=params,
                search_func=mock_search_func,
                filter_on_email_optin=True,
            )
            mock_create_search_obj.assert_called_with(
                user,
                search_param_dict=params,
                filter_on_email_optin=True,
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
            filter_on_email_optin=True,
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].user_id, self.learner.id)
        self.assertTrue(results[0].program.is_learner)
        self.assertTrue(results[0].profile.email_optin)

    def test_search_for_field(self):
        """
        Test that a set of search results will yield an expected set of values
        """
        test_es_page_size = 2
        search = create_search_obj(self.user)
        user_ids = self.program.programenrollment_set.values_list("user__id", flat=True).order_by("-user__id")
        results = search_for_field(search, 'user_id', page_size=test_es_page_size)
        assert results == set(user_ids[:test_es_page_size])

    def test_all_query_matching_emails(self):
        """
        Test that a set of search results will yield an expected set of emails
        """
        test_es_page_size = 2
        search = create_search_obj(self.user)
        user_ids = self.program.programenrollment_set.values_list("user__email", flat=True).order_by("-user__id")
        results = get_all_query_matching_emails(search, page_size=test_es_page_size)
        assert results == set(user_ids[:test_es_page_size])

    # This patch works around on_commit by invoking it immediately, since in TestCase all tests run in transactions
    @patch('search.signals.transaction.on_commit', side_effect=lambda callback: callback())
    def test_document_needs_update(self, mocked_on_commit):
        """
        If a document on ES is out of date with the database, document_needs_update should return true
        """
        enrollment = ProgramEnrollmentFactory.create()
        assert document_needs_updating(enrollment) is False

        with mute_signals(post_save):
            enrollment.user.profile.first_name = "Changed"
            enrollment.user.profile.save()

        assert document_needs_updating(enrollment) is True

    def test_document_needs_update_missing(self):
        """
        If a document doesn't exist on Elasticsearch, document_needs_update should return true
        """
        with mute_signals(post_save):
            enrollment = ProgramEnrollmentFactory.create()
        assert document_needs_updating(enrollment) is True


# This patch works around on_commit by invoking it immediately, since in TestCase all tests run in transactions
@patch('search.signals.transaction.on_commit', side_effect=lambda callback: callback())
class PercolateTests(ESTestCase):
    """Tests regarding percolator queries"""

    def test_search_percolate_queries(self, mock_on_commit):
        """search_percolate_queries should find all PercolateQuery which match the given ProgramEnrollment"""
        with mute_signals(post_save):
            profile = ProfileFactory.create(filled_out=True)
        program_enrollment = ProgramEnrollmentFactory.create(user=profile.user)
        matching_query = {
            "query": {
                "match": {
                    "profile.first_name": profile.first_name,
                }
            }
        }
        query = PercolateQuery.objects.create(
            query=matching_query,
            original_query={},
            source_type=PercolateQuery.AUTOMATIC_EMAIL_TYPE,
        )

        # Another query which matches but has a different source_type
        PercolateQuery.objects.create(
            query=matching_query,
            original_query={},
            source_type=PercolateQuery.DISCUSSION_CHANNEL_TYPE,
        )

        # Another query that doesn't match
        PercolateQuery.objects.create(query={
            "query": {
                "match": {
                    "profile.first_name": "missing",
                }
            }
        }, original_query={}, source_type=PercolateQuery.AUTOMATIC_EMAIL_TYPE)

        # Only the first appears in the results
        assert list(
            search_percolate_queries(
                program_enrollment.id,
                PercolateQuery.AUTOMATIC_EMAIL_TYPE,
            ).values_list("id", flat=True)
        ) == [query.id]

    def test_not_percolated(self, mock_on_commit):
        """If there are no percolated queries we should return an empty queryset"""
        with mute_signals(post_save):
            profile = ProfileFactory.create(filled_out=True)
        program_enrollment = ProgramEnrollmentFactory.create(user=profile.user)
        assert list(search_percolate_queries(program_enrollment.id, PercolateQuery.AUTOMATIC_EMAIL_TYPE)) == []

    def test_adjust_search_for_percolator(self, mock_on_commit):
        """adjust_search_for_percolator should move post_filter into the query itself and remove all other pieces"""
        original_query = {
            "query": {
                "multi_match": {
                    "query": "p",
                    "analyzer": "folding",
                    "type": "phrase_prefix",
                    "fields": ["profile.first_name.folded"]
                }
            },
            "post_filter": {"term": {"program.id": 1}},
            "aggs": {
                "profile.work_history.company_name11": {
                    "filter": {"term": {"program.id": 1}}
                }
            },
            "size": 50,
            "sort": [
                {
                    "profile.last_name": {"order": "asc"}
                }
            ]
        }
        search_obj = Search.from_dict(original_query)
        adjusted_search = adjust_search_for_percolator(search_obj)
        assert adjusted_search.to_dict() == {
            'query': {
                'bool': {
                    'filter': [
                        {'term': {'program.id': 1}}
                    ],
                    'must': [
                        {
                            'multi_match': {
                                'analyzer': 'folding',
                                'fields': ['profile.first_name.folded'],
                                'query': 'p',
                                'type': 'phrase_prefix'
                            }
                        }
                    ]
                }
            }
        }

    def test_percolate_failure(self, mock_on_commit):
        """
        If search_percolate fails we should raise an Exception with some useful information for Sentry
        """
        failures = [
            {
                "shard": 0,
                "index": "index",
                "status": "BAD_REQUEST",
                "reason": {
                    "type": "parse_exception",
                    "reason": "failed to parse request",
                    "caused_by": {
                        "type": "mapper_parsing_exception",
                        "reason": "Cannot generate dynamic mappings of type [_id] for [_id]"
                    }
                }
            }
        ]
        failure_payload = {
            "took": 1,
            "_shards": {
                "total": 5,
                "successful": 0,
                "failed": 5,
                "failures": failures
            },
            "total": 0,
            "matches": []
        }
        with mute_signals(post_save):
            profile = ProfileFactory.create(filled_out=True)
        program_enrollment = ProgramEnrollmentFactory.create(user=profile.user)
        with self.assertRaises(PercolateException) as ex, patch(
            'search.api.get_conn', return_value=Mock(percolate=Mock(return_value=failure_payload))
        ):
            search_percolate_queries(program_enrollment.id, "doesnt_matter")
        assert ex.exception.args[0] == "Failed to percolate: {}".format(failures)
