"""
Tests for search API functions.
"""
from unittest.mock import patch

from django.conf import settings
from django.db.models.signals import post_save
from factory.django import mute_signals
from requests import get

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
    get_conn,
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
        self.index = settings.ELASTICSEARCH_INDEX
        self.url = "{}/{}".format(settings.ELASTICSEARCH_URL, self.index)
        if not self.url.startswith("http"):
            self.url = "http://{}".format(self.url)
        self.search_url = "{}/{}".format(self.url, "_search")
        self.mapping_url = "{}/{}".format(self.url, "_mapping")

    def search(self):
        """Gets full index data from the _search endpoint"""
        refresh_index()
        return get(self.search_url).json()['hits']

    def get_percolate_query(self, _id):
        """Get percolate query"""
        return get("{}/.percolator/{}".format(self.url, _id)).json()

    def get_mappings(self):
        """Gets mapping data"""
        refresh_index()
        return get(self.mapping_url).json()[self.index]['mappings']


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
            index_chunk.assert_any_call(program_enrollments[0:4], USER_DOC_TYPE)
            assert serialize_mock.call_count == len(program_enrollments)
            for enrollment in program_enrollments:
                serialize_mock.assert_any_call(enrollment)

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
        super(GetConnTests, self).setUp()

        conn = get_conn(verify=False)
        index_name = settings.ELASTICSEARCH_INDEX
        conn.indices.delete(index_name)

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
        assert str(ex.exception) == "Unable to find index {}".format(settings.ELASTICSEARCH_INDEX)

    def test_no_mapping(self):
        """
        Test that error is raised if we don't have a mapping
        """
        conn = get_conn(verify=False)
        conn.indices.create(settings.ELASTICSEARCH_INDEX)

        with self.assertRaises(ReindexException) as ex:
            get_conn()
        assert str(ex.exception) == "Mapping {} not found".format(USER_DOC_TYPE)


class RecreateIndexTests(ESTestCase):
    """
    Tests for management commands
    """
    def setUp(self):
        """
        Start without any index
        """
        super(RecreateIndexTests, self).setUp()
        conn = get_conn(verify=False)
        index_name = settings.ELASTICSEARCH_INDEX
        if conn.indices.exists(index_name):
            conn.indices.delete(index_name)

    def test_create_index(self):
        """
        Test that recreate_index will create an index and let search successfully
        """
        recreate_index()
        assert es.search()['total'] == 0

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


class PercolateQueryTests(ESTestCase):
    """
    Tests for indexing of percolate queries
    """

    def test_index_percolate_query(self):
        """Test that we index the percolate query"""
        query = {"query": {"match": {"profile.first_name": "here"}}}
        percolate_query = PercolateQuery(query=query)
        percolate_query_id = 123
        percolate_query.id = percolate_query_id
        # Don't save since that will trigger a signal which will update the index
        assert es.get_percolate_query(percolate_query_id) == {
            '_id': str(percolate_query_id),
            '_index': settings.ELASTICSEARCH_INDEX,
            '_type': PERCOLATE_DOC_TYPE,
            'found': False,
        }
        index_percolate_queries([percolate_query])
        assert es.get_percolate_query(percolate_query_id) == {
            '_id': str(percolate_query_id),
            '_index': settings.ELASTICSEARCH_INDEX,
            '_source': query,
            '_type': PERCOLATE_DOC_TYPE,
            '_version': 1,
            'found': True,
        }

    def test_delete_percolate_queries(self):
        """Test that we delete the percolate query from the index"""
        query = {"query": {"match": {"profile.first_name": "here"}}}
        percolate_query = PercolateQuery.objects.create(query=query)
        assert es.get_percolate_query(percolate_query.id) == {
            '_id': str(percolate_query.id),
            '_index': settings.ELASTICSEARCH_INDEX,
            '_source': query,
            '_type': PERCOLATE_DOC_TYPE,
            '_version': 1,
            'found': True,
        }
        delete_percolate_query(percolate_query.id)
        assert es.get_percolate_query(percolate_query.id) == {
            '_id': str(percolate_query.id),
            '_index': settings.ELASTICSEARCH_INDEX,
            '_type': PERCOLATE_DOC_TYPE,
            'found': False,
        }
        # If we delete it again there should be no exception
        delete_percolate_query(percolate_query.id)
        assert es.get_percolate_query(percolate_query.id) == {
            '_id': str(percolate_query.id),
            '_index': settings.ELASTICSEARCH_INDEX,
            '_type': PERCOLATE_DOC_TYPE,
            'found': False,
        }
