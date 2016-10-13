"""
Tests for search API functions.
"""

from django.conf import settings
from django.db.models.signals import post_save
from factory.django import mute_signals
from requests import get
from mock import patch

from dashboard.factories import (
    CachedCertificateFactory,
    CachedEnrollmentFactory,
    ProgramEnrollmentFactory
)
from dashboard.models import ProgramEnrollment
from dashboard.serializers import UserProgramSerializer
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
    USER_DOC_TYPE
)
from search.base import ESTestCase
from search.exceptions import ReindexException
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


# pylint: disable=no-self-use
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
        EmploymentFactory.create(profile=program_enrollment.user.profile)
        assert_search(es.search(), [program_enrollment])

    def test_employment_update(self):
        """
        Test that Employment is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search()['total'] == 1
        employment = EmploymentFactory.create(profile=program_enrollment.user.profile)
        employment.city = 'city'
        employment.save()
        assert_search(es.search(), [program_enrollment])

    def test_employment_delete(self):
        """
        Test that Employment is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        employment = EmploymentFactory.create(profile=program_enrollment.user.profile)
        assert_search(es.search(), [program_enrollment])
        employment.delete()
        assert_search(es.search(), [program_enrollment])

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
        with patch('search.indexing_api._index_program_enrolled_users_chunk', autospec=True, return_value=0) \
                as index_chunk:
            index_program_enrolled_users(program_enrollments, chunk_size=4)
            assert index_chunk.call_count == 3
            index_chunk.assert_any_call(program_enrollments[0:4])

    def test_add_edx_record(self):
        """
        Test that cached edX records are indexed after being added
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory]:
            assert es.search()['total'] == 1
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            assert_search(es.search(), [program_enrollment])

    def test_update_edx_record(self):
        """
        Test that a cached edX record is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory]:
            assert es.search()['total'] == 1
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_record = edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            edx_record.data.update({'new': 'data'})
            edx_record.save()
            assert_search(es.search(), [program_enrollment])

    def test_delete_edx_record(self):
        """
        Test that a cached edX record is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory]:
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_record = edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            assert_search(es.search(), [program_enrollment])
            edx_record.delete()
            assert_search(es.search(), [program_enrollment])

    def test_not_analyzed(self):
        """
        At the moment no string fields in the mapping should be 'analyzed' since there's no field
        supporting full text search.
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        EducationFactory.create(profile=program_enrollment.user.profile)
        EmploymentFactory.create(profile=program_enrollment.user.profile)

        mapping = es.get_mappings()
        nodes = list(traverse_mapping(mapping))
        for node in nodes:
            if node.get('type') == 'string':
                assert node['index'] == 'not_analyzed'


class SerializerTests(ESTestCase):
    """
    Tests for document serializers
    """

    def test_program_enrolled_user_serializer(self):  # pylint: disable=no-self-use
        """
        Asserts the output of the serializer for program-enrolled users (ProgramEnrollments)
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        EducationFactory.create(profile=profile)
        EmploymentFactory.create(profile=profile)
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
            'profile': ProfileSerializer().to_representation(profile),
            'program': UserProgramSerializer.serialize(program_enrollment)
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

    def test_create_index(self):  # pylint: disable=no-self-use
        """
        Test that recreate_index will create an index and let search successfully
        """
        recreate_index()
        assert es.search()['total'] == 0

    def test_update_index(self):  # pylint: disable=no-self-use
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
