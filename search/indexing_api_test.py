"""
Tests for search API functions.
"""
from unittest.mock import (
    ANY,
    patch,
)

from ddt import (
    data,
    ddt,
)
from django.conf import settings
from django.db.models.signals import post_save
from elasticsearch.exceptions import NotFoundError
from factory.django import mute_signals

from dashboard.factories import (
    CachedCertificateFactory,
    CachedEnrollmentFactory,
    CachedCurrentGradeFactory,
    ProgramEnrollmentFactory
)
from dashboard.models import ProgramEnrollment
from dashboard.serializers import UserProgramSearchSerializer
from courses.factories import (
    ProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from profiles.factories import (
    EducationFactory,
    EmploymentFactory,
    ProfileFactory,
)
from profiles.serializers import (
    ProfileSerializer
)
from search.indexing_api import (
    delete_index,
    get_active_aliases,
    get_conn,
    get_default_alias,
    get_temp_alias,
    recreate_index,
    refresh_index,
    index_program_enrolled_users,
    remove_program_enrolled_user,
    serialize_program_enrolled_user,
    USER_DOC_TYPE,
    filter_current_work,
    index_percolate_queries,
    delete_percolate_query,
    PERCOLATE_DOC_TYPE,
)
from search.base import ESTestCase
from search.exceptions import ReindexException
from search.models import PercolateQuery
from search.util import traverse_mapping
from micromasters.utils import dict_without_key


class ESTestActions:
    """
    Provides helper functions for tests to communicate with ES
    """
    def __init__(self):
        self.conn = get_conn(verify=False)

    def search(self):
        """Gets full index data from the _search endpoint"""
        refresh_index(get_default_alias())
        return self.conn.search(index=get_default_alias())['hits']

    def get_percolate_query(self, _id):
        """Get percolate query"""
        return self.conn.get(id=_id, index=get_default_alias(), doc_type=PERCOLATE_DOC_TYPE)

    def get_mappings(self):
        """Gets mapping data"""
        refresh_index(get_default_alias())
        mapping = self.conn.indices.get_mapping(index=get_default_alias())
        return list(mapping.values())[0]['mappings']

    def get_default_backing_index(self):
        """Get the default backing index"""
        return list(self.conn.indices.get_alias(name=get_default_alias()).keys())[0]


es = ESTestActions()


def assert_search(results, program_enrollments):
    """
    Assert that search results match program-enrolled users
    """
    assert results['total'] == len(program_enrollments)
    sources = sorted([hit['_source'] for hit in results['hits']], key=lambda hit: hit['id'])
    sorted_program_enrollments = sorted(program_enrollments, key=lambda program_enrollment: program_enrollment.id)
    serialized = [
        dict_without_key(serialize_program_enrolled_user(program_enrollment), "_id")
        for program_enrollment in sorted_program_enrollments
    ]
    assert serialized == sources


class IndexTests(ESTestCase):
    """
    Tests for indexing
    """

    def test_program_enrollment_add(self):
        """
        Test that a newly created ProgramEnrollment is indexed properly
        """
        assert es.search()['total'] == 0
        program_enrollment = ProgramEnrollmentFactory.create()
        assert_search(es.search(), [program_enrollment])

    def test_program_enrollment_delete(self):
        """
        Test that ProgramEnrollment is removed from index after the user is removed
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search()['total'] == 1
        program_enrollment.user.delete()
        assert es.search()['total'] == 0

    def test_profile_update(self):
        """
        Test that ProgramEnrollment is reindexed after the User's Profile has been updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search()['total'] == 1
        profile = program_enrollment.user.profile
        profile.first_name = 'updated'
        profile.save()
        assert_search(es.search(), [program_enrollment])

    def test_program_enrollment_clear_upon_profile_deletion(self):
        """
        Test that all ProgramEnrollments are cleared from the index after the User's Profile has been deleted
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        ProgramEnrollmentFactory.create(user=profile.user)
        ProgramEnrollmentFactory.create(user=profile.user)
        assert es.search()['total'] == 2
        profile.delete()
        assert es.search()['total'] == 0

    def test_education_add(self):
        """
        Test that Education is indexed after being added
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search()['total'] == 1
        EducationFactory.create(profile=program_enrollment.user.profile)
        assert_search(es.search(), [program_enrollment])

    def test_education_update(self):
        """
        Test that Education is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search()['total'] == 1
        education = EducationFactory.create(profile=program_enrollment.user.profile)
        education.school_city = 'city'
        education.save()
        assert_search(es.search(), [program_enrollment])

    def test_education_delete(self):
        """
        Test that Education is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        education = EducationFactory.create(profile=program_enrollment.user.profile)
        assert_search(es.search(), [program_enrollment])
        education.delete()
        assert_search(es.search(), [program_enrollment])

    def test_employment_add(self):
        """
        Test that Employment is indexed after being added
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search()['total'] == 1
        EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        assert_search(es.search(), [program_enrollment])

    def test_employment_update(self):
        """
        Test that Employment is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search()['total'] == 1
        employment = EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        employment.city = 'city'
        employment.save()
        assert_search(es.search(), [program_enrollment])

    def test_employment_delete(self):
        """
        Test that Employment is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        employment = EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        assert_search(es.search(), [program_enrollment])
        employment.delete()
        assert_search(es.search(), [program_enrollment])

    def test_past_employment_add(self):
        """
        Test that past work history is not indexed
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        EmploymentFactory.create(profile=program_enrollment.user.profile)
        search_result = es.search()['hits'][0]['_source']['profile']['work_history']
        assert len(search_result) == 1
        self.assertFalse(search_result[0]['end_date'])

    def test_remove_program_enrolled_user(self):
        """
        Test that remove_program_enrolled_user removes the user from the index for that program
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert_search(es.search(), [program_enrollment])
        remove_program_enrolled_user(program_enrollment)
        assert_search(es.search(), [])

    def test_remove_user_other_index(self):
        """
        Test that remove_program_enrolled_user will use another index if provided
        """
        other_indices = ['other1', 'other2']
        program_enrollment = ProgramEnrollmentFactory.create()
        with patch('search.indexing_api._delete_item', autospec=True) as _delete_item:
            remove_program_enrolled_user(program_enrollment, indices=other_indices)
        for other_index in other_indices:
            _delete_item.assert_any_call(program_enrollment.id, USER_DOC_TYPE, other_index)

    def test_index_program_enrolled_users(self):
        """
        Test that index_program_enrolled_users indexes an iterable of program-enrolled users
        """
        with mute_signals(post_save):
            program_enrollments = [ProgramEnrollmentFactory.build() for _ in range(10)]
        with patch(
            'search.indexing_api._index_chunk', autospec=True, return_value=0
        ) as index_chunk, patch(
            'search.indexing_api.serialize_program_enrolled_user', autospec=True, side_effect=lambda x: x
        ) as serialize_mock:
            index_program_enrolled_users(program_enrollments, chunk_size=4)
            assert index_chunk.call_count == 3
            index_chunk.assert_any_call(program_enrollments[0:4], USER_DOC_TYPE, get_default_alias())
            assert serialize_mock.call_count == len(program_enrollments)
            for enrollment in program_enrollments:
                serialize_mock.assert_any_call(enrollment)

    def test_index_user_other_index(self):
        """
        Test that index_program_enrolled_users uses another index if provided
        """
        other_indices = ['other1', 'other2']
        with patch('search.indexing_api._index_chunks', autospec=True) as _index_chunk:
            index_program_enrolled_users([], indices=other_indices)
        for index in other_indices:
            _index_chunk.assert_any_call(ANY, USER_DOC_TYPE, index, chunk_size=100)

    def test_add_edx_record(self):
        """
        Test that cached edX records are indexed after being added
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory, CachedCurrentGradeFactory]:
            assert es.search()['total'] == 1
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(), [program_enrollment])

    def test_update_edx_record(self):
        """
        Test that a cached edX record is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory, CachedCurrentGradeFactory]:
            assert es.search()['total'] == 1
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_record = edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            index_program_enrolled_users([program_enrollment])
            edx_record.data.update({'new': 'data'})
            edx_record.save()
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(), [program_enrollment])

    def test_delete_edx_record(self):
        """
        Test that a cached edX record is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory, CachedCurrentGradeFactory]:
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_record = edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(), [program_enrollment])
            edx_record.delete()
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(), [program_enrollment])

    def test_analyzed(self):
        """
        Most string fields in the mapping should be 'analyzed' since we don't want to
        tokenize strings arbitrarily when filtering on fields.
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        EducationFactory.create(profile=program_enrollment.user.profile)
        EmploymentFactory.create(profile=program_enrollment.user.profile)

        mapping = es.get_mappings()
        nodes = list(traverse_mapping(mapping, ""))
        for key, node in nodes:
            if key == "folded":
                assert node['analyzer'] == "folding"
            elif node.get('type') == 'string':
                assert node['index'] == 'not_analyzed'

    def test_folded(self):
        """
        Check that we have a folded type for first_name, last_name, and preferred_name
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        EducationFactory.create(profile=program_enrollment.user.profile)
        EmploymentFactory.create(profile=program_enrollment.user.profile)

        mapping = es.get_mappings()
        properties = mapping['program_user']['properties']['profile']['properties']
        for key in 'first_name', 'last_name', 'preferred_name':
            assert properties[key]['fields']['folded']['analyzer'] == 'folding'


class SerializerTests(ESTestCase):
    """
    Tests for document serializers
    """

    def test_program_enrolled_user_serializer(self):
        """
        Asserts the output of the serializer for program-enrolled users (ProgramEnrollments)
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        EducationFactory.create(profile=profile)
        EmploymentFactory.create(profile=profile)
        EmploymentFactory.create(profile=profile, end_date=None)
        program = ProgramFactory.create()
        course = CourseFactory.create(program=program)
        course_runs = [CourseRunFactory.create(course=course) for _ in range(2)]
        for course_run in course_runs:
            CachedCertificateFactory.create(user=profile.user, course_run=course_run)
            CachedEnrollmentFactory.create(user=profile.user, course_run=course_run)
        program_enrollment = ProgramEnrollment.objects.create(user=profile.user, program=program)

        assert serialize_program_enrolled_user(program_enrollment) == {
            '_id': program_enrollment.id,
            'id': program_enrollment.id,
            'user_id': profile.user.id,
            'email': profile.user.email,
            'profile': filter_current_work(ProfileSerializer(profile).data),
            'program': UserProgramSearchSerializer.serialize(program_enrollment)
        }


class GetConnTests(ESTestCase):
    """
    Tests for get_conn
    """
    def setUp(self):
        """
        Start without any index
        """
        super().setUp()

        conn = get_conn(verify=False)
        for index in conn.indices.get_aliases().keys():
            if index.startswith(settings.ELASTICSEARCH_INDEX):
                conn.indices.delete(index)

        # Clear globals
        from search import indexing_api
        indexing_api._CONN = None  # pylint: disable=protected-access
        indexing_api._CONN_VERIFIED = False  # pylint: disable=protected-access

    def test_no_index(self):
        """
        Test that an error is raised if we don't have an index
        """
        with self.assertRaises(ReindexException) as ex:
            get_conn()
        assert str(ex.exception) == "Unable to find index {}".format(get_default_alias())

    def test_no_index_not_default(self):
        """
        Test that an error is raised if we don't have an index
        """
        # Reset default index so it does not cause an error
        recreate_index()
        other_index = "other"
        delete_index([other_index])

        with self.assertRaises(ReindexException) as ex:
            get_conn(verify_index=other_index)
        assert str(ex.exception) == "Unable to find index {}".format(other_index)

    def test_no_mapping(self):
        """
        Test that error is raised if we don't have a mapping
        """
        conn = get_conn(verify=False)
        backing_index = "{}_backing".format(settings.ELASTICSEARCH_INDEX)
        conn.indices.create(backing_index)
        conn.indices.put_alias(name=get_default_alias(), index=backing_index)

        with self.assertRaises(ReindexException) as ex:
            get_conn()
        assert str(ex.exception) == "Mapping {} not found".format(USER_DOC_TYPE)


@ddt
class RecreateIndexTests(ESTestCase):
    """
    Tests for management commands
    """
    def setUp(self):
        """
        Start without any index
        """
        super().setUp()
        conn = get_conn(verify=False)
        for index in conn.indices.get_aliases().keys():
            if index.startswith(settings.ELASTICSEARCH_INDEX):
                conn.indices.delete(index)

    def test_create_index(self):
        """
        Test that recreate_index will create an index and let search successfully
        """
        recreate_index()
        assert es.search()['total'] == 0

    @data(True, False)
    def test_keep_alias(self, existing_temp_alias):
        """
        Test that recreate_index will point an existing alias at a new backing index
        """
        recreate_index()
        conn = get_conn(verify=False)
        default_alias = get_default_alias()
        temp_alias = get_temp_alias()
        assert conn.indices.exists_alias(name=temp_alias) is False

        if existing_temp_alias:
            # Create a temp alias to assert that it doesn't change anything
            backing_index = "{}_backing".format(temp_alias)
            conn.indices.create(backing_index)
            conn.indices.put_alias(name=temp_alias, index=backing_index)

        old_backing_indexes = list(conn.indices.get_alias(name=default_alias).keys())
        assert len(old_backing_indexes) == 1
        recreate_index()
        new_backing_indexes = list(conn.indices.get_alias(name=get_default_alias()).keys())
        assert len(new_backing_indexes) == 1
        # Backing index should have changed
        assert old_backing_indexes != new_backing_indexes
        # Temp index should have been deleted
        assert conn.indices.exists_alias(name=temp_alias) is False

    def test_update_index(self):
        """
        Test that recreate_index will clear old data and index all profiles
        """
        recreate_index()
        program_enrollment = ProgramEnrollmentFactory.create()
        assert_search(es.search(), [program_enrollment])
        remove_program_enrolled_user(program_enrollment)
        assert_search(es.search(), [])
        # recreate_index should index the program-enrolled user
        recreate_index()
        assert_search(es.search(), [program_enrollment])

    def test_get_active_indices(self):
        """
        Test that active indices includes the default plus the temporary, if it exists
        """
        temp_index = get_temp_alias()
        other_index = "{}_other".format(settings.ELASTICSEARCH_INDEX)
        conn = get_conn(verify=False)
        assert get_active_aliases() == []
        recreate_index()
        assert get_active_aliases() == [get_default_alias()]
        backing_temp = "{}_backing".format(temp_index)
        conn.indices.create(backing_temp)
        conn.indices.put_alias(index=backing_temp, name=temp_index)
        backing_other = "{}_backing".format(other_index)
        conn.indices.create(backing_other)
        conn.indices.put_alias(index=backing_other, name=other_index)

        assert get_active_aliases() == [
            get_default_alias(),
            get_temp_alias(),
        ]


class PercolateQueryTests(ESTestCase):
    """
    Tests for indexing of percolate queries
    """

    def test_index_percolate_query(self):
        """Test that we index the percolate query"""
        query = {"query": {"match": {"profile.first_name": "here"}}}
        percolate_query = PercolateQuery(query=query, original_query="original")
        percolate_query_id = 123
        percolate_query.id = percolate_query_id
        # Don't save since that will trigger a signal which will update the index
        with self.assertRaises(NotFoundError):
            es.get_percolate_query(percolate_query_id)
        index_percolate_queries([percolate_query])
        assert es.get_percolate_query(percolate_query_id) == {
            '_id': str(percolate_query_id),
            '_index': es.get_default_backing_index(),
            '_source': query,
            '_type': PERCOLATE_DOC_TYPE,
            '_version': 1,
            'found': True,
        }

    def test_index_other_index(self):
        """Make sure we use the index name passed in"""
        other_indices = ["other1", "other2"]
        with patch('search.indexing_api._index_chunks', autospec=True) as _index_chunks:
            index_percolate_queries([], indices=other_indices)
        for index in other_indices:
            _index_chunks.assert_any_call(ANY, PERCOLATE_DOC_TYPE, index, chunk_size=100)

    def test_delete_percolate_queries(self):
        """Test that we delete the percolate query from the index"""
        query = {"query": {"match": {"profile.first_name": "here"}}}
        with patch('search.signals.transaction', on_commit=lambda callback: callback()):
            percolate_query = PercolateQuery.objects.create(query=query, original_query="original")
            assert es.get_percolate_query(percolate_query.id) == {
                '_id': str(percolate_query.id),
                '_index': es.get_default_backing_index(),
                '_source': query,
                '_type': PERCOLATE_DOC_TYPE,
                '_version': 1,
                'found': True,
            }
            delete_percolate_query(percolate_query.id)
            with self.assertRaises(NotFoundError):
                es.get_percolate_query(percolate_query.id)
            # If we delete it again there should be no exception
            delete_percolate_query(percolate_query.id)
            with self.assertRaises(NotFoundError):
                es.get_percolate_query(percolate_query.id)

    def test_delete_other_index(self):
        """Make sure we use the index name passed in"""
        other_indices = ["other1", "other2"]
        with patch('search.indexing_api._delete_item', autospec=True) as _delete_item:
            delete_percolate_query(-1, indices=other_indices)
        for index in other_indices:
            _delete_item.assert_any_call(-1, PERCOLATE_DOC_TYPE, index)
