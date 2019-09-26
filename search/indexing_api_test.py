"""
Tests for search API functions.
"""
import itertools
from unittest.mock import patch

from ddt import (
    data,
    ddt,
    unpack,
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
from roles.models import Role
from roles.roles import (
    Instructor,
    Staff
)
from search.base import ESTestCase
from search.connection import (
    ALL_INDEX_TYPES,
    get_aliases,
    get_default_alias,
    make_alias_name,
    make_backing_index_name,
    GLOBAL_DOC_TYPE,
    PERCOLATE_INDEX_TYPE,
    PUBLIC_ENROLLMENT_INDEX_TYPE,
    PRIVATE_ENROLLMENT_INDEX_TYPE,
)
from search.exceptions import ReindexException
from search.factories import PercolateQueryFactory
from search.indexing_api import (
    clear_and_create_index,
    delete_indices,
    get_conn,
    recreate_index,
    refresh_index,
    index_program_enrolled_users,
    remove_program_enrolled_user,
    serialize_program_enrolled_user,
    serialize_public_enrolled_user,
    filter_current_work,
    index_percolate_queries,
    delete_percolate_query,
)
from search.models import PercolateQuery
from search.util import traverse_mapping

DOC_TYPES_PER_ENROLLMENT = 1


# pylint: disable=too-many-lines
class ESTestActions:
    """
    Provides helper functions for tests to communicate with ES
    """
    def __init__(self):
        self.conn = get_conn(verify=False)

    def search(self, index_type):
        """Gets full index data from the _search endpoint"""
        alias = get_default_alias(index_type)
        refresh_index(alias)
        return self.conn.search(index=alias)['hits']

    def get_percolate_query(self, _id):
        """Get percolate query"""
        index = get_default_alias(PERCOLATE_INDEX_TYPE)
        return self.conn.get(id=_id, doc_type=GLOBAL_DOC_TYPE, index=index)

    def get_mappings(self, index_type):
        """Gets mapping data"""
        alias = get_default_alias(index_type)
        refresh_index(alias)
        mapping = self.conn.indices.get_mapping(index=alias)
        return list(mapping.values())[0]['mappings']

    def get_default_backing_index(self, index_type):
        """Get the default backing index"""
        alias = get_default_alias(index_type)
        return list(self.conn.indices.get_alias(name=alias).keys())[0]


es = ESTestActions()


def get_sources(results):
    """
    Get sources from hits, sorted by source id

    Args:
        results (dict): Elasticsearch results

    Returns:
        list of dict: The list of source dicts
    """
    sorted_hits = sorted(results['hits'], key=lambda hit: hit['_source']['id'])
    return [hit['_source'] for hit in sorted_hits]


def remove_es_keys(hit):
    """
    Removes ES keys from a hit object in-place

    Args:
        hit (dict): Elasticsearch hit object

    Returns:
        dict: modified Elasticsearch hit object
    """
    del hit['_id']
    if '_type' in hit:
        del hit['_type']
    return hit


def assert_search(results, program_enrollments, *, index_type):
    """
    Assert that search results match program-enrolled users
    """
    assert results['total'] == len(program_enrollments) * DOC_TYPES_PER_ENROLLMENT
    sources_advanced = get_sources(results)
    sorted_program_enrollments = sorted(program_enrollments, key=lambda program_enrollment: program_enrollment.id)

    if index_type == PRIVATE_ENROLLMENT_INDEX_TYPE:
        serialized = [
            remove_es_keys(serialize_program_enrolled_user(program_enrollment))
            for program_enrollment in sorted_program_enrollments
        ]
    elif index_type == PUBLIC_ENROLLMENT_INDEX_TYPE:
        serialized = [
            remove_es_keys(serialize_public_enrolled_user(
                serialize_program_enrolled_user(program_enrollment)
            ))
            for program_enrollment in sorted_program_enrollments
        ]
    else:
        raise Exception("Unexpected index type")

    assert serialized == sources_advanced


# pylint: disable=unused-argument
@ddt
@patch('search.signals.transaction.on_commit', side_effect=lambda callback: callback())
class IndexTests(ESTestCase):
    """
    Tests for indexing
    """
    # pylint: disable=too-many-public-methods
    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_program_enrollment_add(self, index_type, mock_on_commit):
        """
        Test that a newly created ProgramEnrollment is indexed properly
        """
        assert es.search(index_type)['total'] == 0
        program_enrollment = ProgramEnrollmentFactory.create()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_program_enrollment_delete(self, index_type, mock_on_commit):
        """
        Test that ProgramEnrollment is removed from index after the user is removed
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        program_enrollment.user.delete()
        assert es.search(index_type)['total'] == 0

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_profile_update(self, index_type, mock_on_commit):
        """
        Test that ProgramEnrollment is reindexed after the User's Profile has been updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        profile = program_enrollment.user.profile
        profile.first_name = 'updated'
        profile.save()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_education_add(self, index_type, mock_on_commit):
        """
        Test that Education is indexed after being added
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        EducationFactory.create(profile=program_enrollment.user.profile)
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_education_update(self, index_type, mock_on_commit):
        """
        Test that Education is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        education = EducationFactory.create(profile=program_enrollment.user.profile)
        education.school_city = 'city'
        education.save()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_education_delete(self, index_type, mock_on_commit):
        """
        Test that Education is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        education = EducationFactory.create(profile=program_enrollment.user.profile)
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)
        education.delete()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_employment_add(self, index_type, mock_on_commit):
        """
        Test that Employment is indexed after being added
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_employment_update(self, index_type, mock_on_commit):
        """
        Test that Employment is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        employment = EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        employment.city = 'city'
        employment.save()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_employment_delete(self, index_type, mock_on_commit):
        """
        Test that Employment is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        employment = EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)
        employment.delete()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_past_employment_add(self, index_type, mock_on_commit):
        """
        Test that past work history is not indexed
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        EmploymentFactory.create(profile=program_enrollment.user.profile, end_date=None)
        EmploymentFactory.create(profile=program_enrollment.user.profile)
        search_result = es.search(index_type)['hits'][0]['_source']['profile']['work_history']
        assert len(search_result) == 1
        self.assertFalse(search_result[0]['end_date'])

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_remove_program_enrolled_user(self, index_type, mock_on_commit):
        """
        Test that remove_program_enrolled_user removes the user from the index for that program
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)
        remove_program_enrolled_user(program_enrollment.id)
        assert_search(es.search(index_type), [], index_type=index_type)

    # pylint: disable=too-many-locals
    def test_index_program_enrolled_users(self, mock_on_commit):
        """
        Test that index_program_enrolled_users indexes an iterable of program-enrolled users
        """
        num_enrollments = 10
        chunk_size = 4
        with mute_signals(post_save):
            program_enrollments = [
                ProgramEnrollmentFactory.create() for _ in range(num_enrollments)
            ]
            for enrollment in program_enrollments:
                ProfileFactory.create(user=enrollment.user)

        private = [serialize_program_enrolled_user(enrollment) for enrollment in program_enrollments]
        private_dicts = {serialized['id']: serialized for serialized in private}
        public = [serialize_public_enrolled_user(serialized) for serialized in private]
        public_dicts = {serialized['id']: serialized for serialized in public}

        with patch(
            'search.indexing_api._index_chunk', autospec=True, return_value=0
        ) as index_chunk, patch(
            'search.indexing_api.serialize_program_enrolled_user', autospec=True,
            side_effect=lambda x: private_dicts[x.id]
        ) as serialize_mock, patch(
            'search.indexing_api.serialize_public_enrolled_user', autospec=True,
            side_effect=lambda x: public_dicts[x['id']]
        ) as serialize_public_mock:
            index_program_enrolled_users(program_enrollments, chunk_size=chunk_size)
            assert index_chunk.call_count == 6  # 10 enrollments divided in chunks of 4, times the number of types (2)

            public_index = make_alias_name(PUBLIC_ENROLLMENT_INDEX_TYPE, is_reindexing=False)
            private_index = make_alias_name(PRIVATE_ENROLLMENT_INDEX_TYPE, is_reindexing=False)
            for offset in range(0, num_enrollments, chunk_size):
                # each enrollment should get yielded twice to account for each doctype
                index_chunk.assert_any_call(
                    public[offset:offset+4],  # ordered dicts FTW
                    index=public_index
                )
                index_chunk.assert_any_call(
                    private[offset:offset+4],
                    index=private_index
                )

            assert serialize_mock.call_count == len(program_enrollments)
            assert serialize_public_mock.call_count == len(program_enrollments)
            for enrollment in program_enrollments:
                serialize_mock.assert_any_call(enrollment)
                serialize_public_mock.assert_any_call(private_dicts[enrollment.id])

    def test_index_program_enrolled_users_missing_profiles(self, mock_on_commit):
        """
        Test that index_program_enrolled_users doesn't index users missing profiles
        """
        with mute_signals(post_save):
            program_enrollments = [ProgramEnrollmentFactory.build() for _ in range(10)]
        with patch(
            'search.indexing_api._index_chunk', autospec=True, return_value=0
        ) as index_chunk, patch(
            'search.indexing_api.serialize_program_enrolled_user',
            autospec=True,
            side_effect=lambda x: None  # simulate a missing profile
        ) as serialize_mock, patch(
            'search.indexing_api.serialize_public_enrolled_user', autospec=True, side_effect=lambda x: x
        ) as serialize_public_mock:
            index_program_enrolled_users(program_enrollments)
            assert index_chunk.call_count == 0
            assert serialize_public_mock.call_count == 0
            assert serialize_mock.call_count == len(program_enrollments)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_add_edx_record(self, index_type, mock_on_commit):
        """
        Test that cached edX records are indexed after being added
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory, CachedCurrentGradeFactory]:
            assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_update_edx_record(self, index_type, mock_on_commit):
        """
        Test that a cached edX record is reindexed after being updated
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory, CachedCurrentGradeFactory]:
            assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_record = edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            index_program_enrolled_users([program_enrollment])
            edx_record.data.update({'new': 'data'})
            edx_record.save()
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    @data(PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE)
    def test_delete_edx_record(self, index_type, mock_on_commit):
        """
        Test that a cached edX record is removed from index after being deleted
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        for edx_cached_model_factory in [CachedCertificateFactory, CachedEnrollmentFactory, CachedCurrentGradeFactory]:
            course = CourseFactory.create(program=program_enrollment.program)
            course_run = CourseRunFactory.create(course=course)
            edx_record = edx_cached_model_factory.create(user=program_enrollment.user, course_run=course_run)
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(index_type), [program_enrollment], index_type=index_type)
            edx_record.delete()
            index_program_enrolled_users([program_enrollment])
            assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    def test_analyzed(self, mock_on_commit):
        """
        Most string fields in the mapping should be 'analyzed' since we don't want to
        tokenize strings arbitrarily when filtering on fields.
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        EducationFactory.create(profile=program_enrollment.user.profile)
        EmploymentFactory.create(profile=program_enrollment.user.profile)

        for index_type in ALL_INDEX_TYPES:
            mapping = es.get_mappings(index_type)
            nodes = list(traverse_mapping(mapping, ""))
            for key, node in nodes:
                if key == "folded":
                    assert node['analyzer'] == "folding"
                elif node.get('type') == 'string':
                    assert node['index'] == 'not_analyzed'

    def test_folded(self, mock_on_commit):
        """
        Check that we have a folded type for first_name, last_name, and preferred_name
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        EducationFactory.create(profile=program_enrollment.user.profile)
        EmploymentFactory.create(profile=program_enrollment.user.profile)

        for index_type in ALL_INDEX_TYPES:
            mapping = es.get_mappings(index_type)
            properties = mapping[GLOBAL_DOC_TYPE]['properties']
            if index_type == PUBLIC_ENROLLMENT_INDEX_TYPE:
                # Make sure we aren't exposing people's email addresses
                assert 'email' not in properties
            else:
                assert properties['email']['fields']['folded']['analyzer'] == 'folding'

            profile_properties = properties['profile']['properties']
            for key in 'first_name', 'last_name', 'preferred_name', 'full_name', 'username':
                assert profile_properties[key]['fields']['folded']['analyzer'] == 'folding'

    @data(
        *itertools.product(
            [Staff.ROLE_ID, Instructor.ROLE_ID],
            [PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE],
        )
    )
    @unpack
    def test_role_add(self, role, index_type, mock_on_commit):
        """
        Test that `is_learner` status is change when role is save
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        sources = get_sources(es.search(index_type))
        # user is learner
        assert sources[0]['program']['is_learner'] is True

        Role.objects.create(
            user=program_enrollment.user,
            program=program_enrollment.program,
            role=role
        )
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        # user is not learner
        sources = get_sources(es.search(index_type))
        assert sources[0]['program']['is_learner'] is False

    @data(
        *itertools.product(
            [Staff.ROLE_ID, Instructor.ROLE_ID],
            [PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE],
        )
    )
    @unpack
    def test_role_delete(self, role, index_type, mock_on_commit):
        """
        Test that `is_learner` status is restore once role is removed for a user.
        """
        program_enrollment = ProgramEnrollmentFactory.create()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        sources = get_sources(es.search(index_type))
        # user is learner
        assert sources[0]['program']['is_learner'] is True
        Role.objects.create(
            user=program_enrollment.user,
            program=program_enrollment.program,
            role=role
        )
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        # user is not learner
        sources = get_sources(es.search(index_type))
        assert sources[0]['program']['is_learner'] is False

        # when staff role is deleted
        Role.objects.filter(
            user=program_enrollment.user,
            program=program_enrollment.program,
            role=role
        ).delete()
        assert es.search(index_type)['total'] == DOC_TYPES_PER_ENROLLMENT
        sources = get_sources(es.search(index_type))
        # user is learner
        assert sources[0]['program']['is_learner'] is True


class SerializerTests(ESTestCase):
    """
    Tests for document serializers
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create()
        EducationFactory.create(profile=cls.profile)
        EmploymentFactory.create(profile=cls.profile)
        EmploymentFactory.create(profile=cls.profile, end_date=None)
        program = ProgramFactory.create()
        course = CourseFactory.create(program=program)
        course_runs = [CourseRunFactory.create(course=course) for _ in range(2)]
        for course_run in course_runs:
            CachedCertificateFactory.create(user=cls.profile.user, course_run=course_run)
            CachedEnrollmentFactory.create(user=cls.profile.user, course_run=course_run)
        cls.program_enrollment = ProgramEnrollment.objects.create(user=cls.profile.user, program=program)

    def test_program_enrolled_user_serializer(self):
        """
        Asserts the output of the serializer for program-enrolled users (ProgramEnrollments)
        """
        profile = self.profile
        program_enrollment = self.program_enrollment
        assert serialize_program_enrolled_user(program_enrollment) == {
            '_id': program_enrollment.id,
            'id': program_enrollment.id,
            'user_id': profile.user.id,
            'email': profile.user.email,
            'profile': filter_current_work(ProfileSerializer(profile).data),
            'program': UserProgramSearchSerializer.serialize(program_enrollment)
        }

    def test_public_enrolled_user_serializer(self):
        """
        Asserts the output of the public serializer for program-enrolled users (ProgramEnrollments)
        """
        profile = self.profile
        program_enrollment = self.program_enrollment

        serialized = serialize_program_enrolled_user(program_enrollment)

        assert serialize_public_enrolled_user(serialized) == {
            '_id': program_enrollment.id,
            'id': program_enrollment.id,
            'user_id': profile.user.id,
            'profile': {
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'full_name': profile.full_name,
                'preferred_name': profile.preferred_name,
                'romanized_first_name': profile.romanized_first_name,
                'romanized_last_name': profile.romanized_last_name,
                'image': '/media/{}'.format(profile.image),
                'image_small': '/media/{}'.format(profile.image_small),
                'image_medium': '/media/{}'.format(profile.image_medium),
                'username': None,  # bug in ProfileSerializer, issue #3166
                'filled_out': profile.filled_out,
                'account_privacy': profile.account_privacy,
                'country': profile.country,
                'state_or_territory': profile.state_or_territory,
                'city': profile.city,
                'birth_country': profile.birth_country,
                'work_history': serialized['profile']['work_history'],
            },
            'program': {
                'id': program_enrollment.program.id,
                'enrollments': [{
                    'course_title': enrollment['course_title'],
                    'semester': enrollment['semester']
                } for enrollment in serialized['program']['enrollments']],
                'courses': [{
                    'course_title': enrollment['course_title']
                } for enrollment in serialized['program']['courses']],
                'course_runs': [{
                    'semester': semester_enrolled['semester']

                } for semester_enrolled in serialized['program']['course_runs']],
                'is_learner': True,
                'total_courses': 1,
            }
        }


@ddt
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
        for index in conn.indices.get_alias().keys():
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
        assert "Unable to find index" in str(ex.exception)

    def test_no_index_not_default(self):
        """
        Test that an error is raised if we don't have an index
        """
        # Reset default index so it does not cause an error
        recreate_index()
        other_index = "other"
        delete_indices()

        with self.assertRaises(ReindexException) as ex:
            get_conn(verify_indices=[other_index])
        assert str(ex.exception) == "Unable to find index {}".format(other_index)

    @data(
        [False, PRIVATE_ENROLLMENT_INDEX_TYPE, ('testindex_private_enrollment_default',)],
        [False, PUBLIC_ENROLLMENT_INDEX_TYPE, ('testindex_public_enrollment_default',)],
        [False, PERCOLATE_INDEX_TYPE, ('testindex_percolate_default',)],
        [True, PRIVATE_ENROLLMENT_INDEX_TYPE,
         ('testindex_private_enrollment_default', 'testindex_private_enrollment_reindexing')],
        [True, PUBLIC_ENROLLMENT_INDEX_TYPE,
         ('testindex_public_enrollment_default', 'testindex_public_enrollment_reindexing')],
        [True, PERCOLATE_INDEX_TYPE,
         ('testindex_percolate_default', 'testindex_percolate_reindexing')],
    )
    @unpack
    # pylint: disable=too-many-arguments
    def test_get_aliases(self, is_reindex, index_type, expected_indices):
        """
        We should choose the correct alias and doc type given the circumstances
        """
        conn = get_conn(verify=False)

        alias = make_alias_name(index_type, is_reindexing=False)

        backing_index = make_backing_index_name()
        # Skip the mapping because it's invalid for 2.x schema, and we don't need it here
        clear_and_create_index(backing_index, index_type=index_type, skip_mapping=True)
        conn.indices.put_alias(index=backing_index, name=alias)

        if is_reindex:
            conn.indices.put_alias(index=backing_index, name=make_alias_name(index_type, is_reindexing=True))

        aliases = get_aliases(index_type)
        assert aliases == list(expected_indices)

        assert get_default_alias(index_type) == aliases[0]


@ddt
class RecreateIndexTests(ESTestCase):
    """
    Tests for management commands
    """

    def tearDown(self):
        super().tearDown()

        conn = get_conn(verify=False)
        for index in conn.indices.get_mapping().keys():
            conn.indices.delete(index=index)

    @data(PUBLIC_ENROLLMENT_INDEX_TYPE, PRIVATE_ENROLLMENT_INDEX_TYPE)
    def test_create_index(self, index_type):
        """
        Test that recreate_index will create an index and let search successfully
        """
        assert es.search(index_type)['total'] == 0

    @data(*itertools.product(
        [True, False],
        [PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE],
    ))
    @unpack
    def test_keep_alias(self, existing_temp_alias, index_type):
        """
        Test that recreate_index will point an existing alias at a new backing index
        """
        conn = get_conn(verify=False)
        default_alias = make_alias_name(index_type, is_reindexing=False)
        temp_alias = make_alias_name(index_type, is_reindexing=True)
        assert conn.indices.exists_alias(name=temp_alias) is False

        if existing_temp_alias:
            # Create a temp alias to assert that it doesn't change anything
            backing_index = "{}_backing".format(temp_alias)
            conn.indices.create(backing_index)
            conn.indices.put_alias(name=temp_alias, index=backing_index)

        old_backing_indexes = list(conn.indices.get_alias(name=default_alias).keys())
        assert len(old_backing_indexes) == 1
        recreate_index()
        new_backing_indexes = list(conn.indices.get_alias(name=default_alias).keys())
        assert len(new_backing_indexes) == 1
        # Backing index should have changed
        assert old_backing_indexes != new_backing_indexes
        # Temp index should have been deleted
        assert conn.indices.exists_alias(name=temp_alias) is False

    @data(PUBLIC_ENROLLMENT_INDEX_TYPE, PRIVATE_ENROLLMENT_INDEX_TYPE)
    def test_update_index(self, index_type):
        """
        Test that recreate_index will clear old data and index all profiles
        """
        with patch('search.signals.transaction.on_commit', side_effect=lambda callback: callback()):
            program_enrollment = ProgramEnrollmentFactory.create()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)
        remove_program_enrolled_user(program_enrollment.id)
        assert_search(es.search(index_type), [], index_type=index_type)
        # recreate_index should index the program-enrolled user
        recreate_index()
        assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

    def test_update_during_recreate_index(self):
        """
        If an indexing action happens during a recreate_index it should update all active indices
        """
        conn = get_conn(verify=False)
        recreate_index()

        temp_aliases = {}
        index_types = [PRIVATE_ENROLLMENT_INDEX_TYPE, PUBLIC_ENROLLMENT_INDEX_TYPE]
        for index_type in index_types:
            # create temporary index
            temp_index = make_backing_index_name()
            temp_alias = make_alias_name(index_type=index_type, is_reindexing=True)
            clear_and_create_index(temp_index, index_type=index_type)
            conn.indices.put_alias(index=temp_index, name=temp_alias)
            temp_aliases[index_type] = temp_alias

        with patch('search.signals.transaction.on_commit', side_effect=lambda callback: callback()):
            program_enrollment = ProgramEnrollmentFactory.create()

        for index_type in index_types:
            assert_search(es.search(index_type), [program_enrollment], index_type=index_type)

            # Temp alias should get updated
            temp_alias = temp_aliases[index_type]
            refresh_index(temp_alias)
            temp_hits = conn.search(index=temp_alias)['hits']
            assert_search(temp_hits, [program_enrollment], index_type=index_type)


class PercolateQueryTests(ESTestCase):
    """
    Tests for indexing of percolate queries
    """

    def test_index_percolate_query(self):
        """Test that we index the percolate query"""
        query = {"query": {"match": {"profile.first_name": "here"}}}
        percolate_query = PercolateQueryFactory.create(query=query, original_query="original")
        percolate_query_id = 123
        percolate_query.id = percolate_query_id
        # Don't save since that will trigger a signal which will update the index
        with self.assertRaises(NotFoundError):
            es.get_percolate_query(percolate_query_id)
        index_percolate_queries([percolate_query])
        assert es.get_percolate_query(percolate_query_id) == {
            '_id': str(percolate_query_id),
            '_index': es.get_default_backing_index(PERCOLATE_INDEX_TYPE),
            '_source': query,
            '_seq_no': 0,
            '_primary_term': 1,
            '_type': GLOBAL_DOC_TYPE,
            '_version': 1,
            'found': True,
        }

    def test_delete_percolate_queries(self):
        """Test that we delete the percolate query from the index"""
        query = {"query": {"match": {"profile.first_name": "here"}}}
        with patch('search.signals.transaction', on_commit=lambda callback: callback()):
            percolate_query = PercolateQueryFactory.create(query=query, original_query="original")
            assert es.get_percolate_query(percolate_query.id) == {
                '_id': str(percolate_query.id),
                '_index': es.get_default_backing_index(PERCOLATE_INDEX_TYPE),
                '_source': query,
                '_seq_no': 0,
                '_primary_term': 1,
                '_type': GLOBAL_DOC_TYPE,
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

    def test_fix_percolate_query(self):
        """
        Make sure all nested -> filter are replaced with nested -> query
        """
        input_query = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "bool": {
                                "must": [
                                    {
                                        "term": {
                                            "program.is_learner": True
                                        }
                                    }
                                ],
                                "should": [
                                    {
                                        "term": {
                                            "program.id": 34
                                        }
                                    }
                                ],
                                "minimum_should_match": 1
                            }
                        },
                        {
                            "term": {
                                "profile.filled_out": True
                            }
                        },
                        {
                            "bool": {
                                "must": [
                                    {
                                        "nested": {
                                            "path": "program.course_runs",
                                            "filter": {
                                                "term": {
                                                    "program.course_runs.semester": "2015 - Summer"
                                                }
                                            }
                                        }
                                    },
                                    {
                                        "term": {
                                            "program.id": 34
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        }
        query = PercolateQueryFactory.create(query=input_query)
        assert index_percolate_queries([query]) == 1

    def test_fix_field_error(self):
        """recreate_index should not cause any error with this percolate query"""
        query = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "bool": {
                                "must": [
                                    {
                                        "term": {
                                            "program.is_learner": True
                                        }
                                    },
                                    {
                                        "term": {
                                            "profile.email_optin": True
                                        }
                                    }
                                ],
                                "should": [
                                    {
                                        "term": {
                                            "program.id": 1
                                        }
                                    },
                                    {
                                        "term": {
                                            "program.id": 2
                                        }
                                    },
                                    {
                                        "term": {
                                            "program.id": 13
                                        }
                                    }
                                ],
                                "minimum_should_match": 1
                            }
                        },
                        {
                            "term": {
                                "profile.filled_out": True
                            }
                        },
                        {
                            "bool": {
                                "must": [
                                    {
                                        "nested": {
                                            "path": "program.courses",
                                            "query": {
                                                "bool": {
                                                    "must": [
                                                        {
                                                            "term": {
                                                                "program.courses.course_title":
                                                                    "Supply Chain Fundamentals  (SC1x)"
                                                            }
                                                        },
                                                        {
                                                            "term": {
                                                                "program.courses.payment_status": "Auditing"
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    {
                                        'nested': {
                                            'path': "program.course_runs",
                                            'query': {
                                                'term': {
                                                    'program.course_runs.semester': "2016 - Summer"
                                                }
                                            }
                                        }
                                    },
                                    {
                                        "term": {
                                            "profile.birth_country": "DE"
                                        }
                                    },
                                    {
                                        "term": {
                                            "profile.country": "US"
                                        }
                                    },
                                    {
                                        "term": {
                                            "program.id": 1
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        }

        PercolateQuery.objects.create(query=query, original_query=query)
        recreate_index()
