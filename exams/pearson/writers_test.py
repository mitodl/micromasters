"""
Tests for TSV writers
"""
import io
from datetime import date, datetime
from unittest import TestCase as UnitTestCase
from unittest.mock import (
    Mock,
    NonCallableMock,
)

import ddt
import pytz
from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals

from exams.pearson.exceptions import (
    InvalidProfileDataException,
    InvalidTsvRowException,
)
from exams.factories import (
    ExamAuthorizationFactory,
    ExamProfileFactory,
)
from exams.pearson.writers import (
    CDDWriter,
    EADWriter,
    BaseTSVWriter,
)
from profiles.factories import ProfileFactory
from profiles.models import Profile

FIXED_DATETIME = datetime(2016, 5, 15, 15, 2, 55, tzinfo=pytz.UTC)
FIXED_DATE = date(2016, 5, 15)


class TSVWriterTestCase(UnitTestCase):
    """
    Base class for tests around TSVWriter implementations
    """
    def setUp(self):
        self.tsv_file = io.StringIO()

    @property
    def tsv_value(self):
        """Extracts the contents of the tsv file"""
        return self.tsv_file.getvalue()

    @property
    def tsv_lines(self):
        """Extracts the lines of the tsv file"""
        return self.tsv_value.splitlines()

    @property
    def tsv_header(self):
        """Extracts the header line of the tsv file"""
        return self.tsv_lines[0]

    @property
    def tsv_rows(self):
        """Extracts the non-header lines of the tsv file"""
        return self.tsv_lines[1:]


class BaseTSVWriterTest(TSVWriterTestCase):
    """
    Tests for Pearson writer code
    """

    def test_get_field_mapper(self):
        """
        Tests that _get_field_mapper handles input correctly
        """
        profile = Profile(address='1 Main St')

        assert BaseTSVWriter.get_field_mapper('address')(profile) == profile.address

        def get_addr1(profile):  # pylint: disable=missing-docstring
            return profile.address

        addr1_field_mapper = BaseTSVWriter.get_field_mapper(get_addr1)

        assert addr1_field_mapper is get_addr1
        assert addr1_field_mapper(profile) == profile.address1

        with self.assertRaises(TypeError):
            BaseTSVWriter.get_field_mapper([])

    def test_format_datetime(self):
        """
        Tests that datetimes format correctly according to Pearson spec
        """
        assert BaseTSVWriter.format_datetime(FIXED_DATETIME) == '2016/05/15 15:02:55'

    def test_format_date(self):
        """
        Tests that datetimes format correctly according to Pearson spec
        """
        assert BaseTSVWriter.format_date(FIXED_DATE) == '2016/05/15'

    def test_writer_init(self):
        """
        Tests that the writer initializes correctly
        """

        fields = [
            ('Prop2', 'prop2'),
        ]

        writer = BaseTSVWriter(fields, field_prefix='prop1')

        assert list(writer.columns) == ['Prop2']  # writer.columns is of odict_keys type so cast to list
        assert len(writer.fields) == len(fields)
        assert len(writer.field_mappers) == len(fields)
        assert callable(writer.prefix_mapper)

        assert BaseTSVWriter([]).prefix_mapper is None

    def test_map_row_with_prefix(self):
        """
        Tests map_row with a prefix set
        """
        writer = BaseTSVWriter([
            ('Prop2', 'prop2'),
        ], field_prefix='prop1')

        row = NonCallableMock()
        row.prop1 = NonCallableMock(prop2=145)

        assert writer.map_row(row) == {
            'Prop2': 145,
        }

    def test_map_row_without_prefix(self):
        """
        Tests map_row with a prefix set
        """
        writer = BaseTSVWriter([
            ('Prop2', 'prop1'),
        ])

        row = NonCallableMock(prop1=145)

        assert writer.map_row(row) == {
            'Prop2': 145,
        }

    def test_write(self):
        """
        Tests the write method outputs correctly
        """
        writer = BaseTSVWriter([
            ('Prop1', 'prop1'),
            ('Prop2', 'prop2'),
        ])

        row = NonCallableMock(
            prop1=145,
            prop2=None,
        )

        valid, invalid = writer.write(self.tsv_file, [row])

        assert valid == [row]
        assert invalid == []
        assert self.tsv_value == (
            "Prop1\tProp2\r\n"
            "145\t\r\n"  # None should convert to an empty string
        )

    def test_write_skips_invalid_rows(self):
        """
        Tests write_cdd_file against a profile with invalid state
        """
        writer = BaseTSVWriter([
            ('Prop1', Mock(side_effect=InvalidTsvRowException)),
        ])

        row = NonCallableMock()

        valid, invalid = writer.write(self.tsv_file, [row])

        assert valid == []
        assert invalid == [row]
        assert self.tsv_value == "Prop1\r\n"


@ddt.ddt
class CDDWriterTest(TSVWriterTestCase, TestCase):
    """
    Tests for CDDWriter
    """
    def setUp(self):
        self.cdd_writer = CDDWriter()
        super().setUp()

    @ddt.data(
        ("Jekyll", None, "Jekyll"),
        (None, "Hyde", "Hyde"),
        ("Jekyll", "Hyde", "Hyde"),
    )
    @ddt.unpack
    def test_first_name(self, unromanized, romanized, expected):
        """
        Test that the `first_name` method prefers the `romanized_first_name`
        field, and falls back on `first_name` field.
        """
        with mute_signals(post_save):
            profile = ExamProfileFactory(
                profile__first_name=unromanized,
                profile__romanized_first_name=romanized,
            )
        assert CDDWriter.first_name(profile) == expected

    @ddt.data(
        ("Jekyll", None, "Jekyll"),
        (None, "Hyde", "Hyde"),
        ("Jekyll", "Hyde", "Hyde"),
    )
    @ddt.unpack
    def test_last_name(self, unromanized, romanized, expected):
        """
        Test that the `last_name` method prefers the `romanized_last_name`
        field, and falls back on `last_name` field.
        """
        with mute_signals(post_save):
            profile = ExamProfileFactory(
                profile__last_name=unromanized,
                profile__romanized_last_name=romanized,
            )
        assert CDDWriter.last_name(profile) == expected

    @ddt.data(
        ("US", "US-MA", "MA"),
        ("CA", "CA-NB", "NB"),
        ("UK", "GB-ABD", ""),
    )
    @ddt.unpack
    def test_profile_state(self, country, state, expected):
        """Test that profile_state returns expected values"""
        with mute_signals(post_save):
            profile = ExamProfileFactory(
                profile__country=country,
                profile__state_or_territory=state
            )
        assert CDDWriter.profile_state(profile) == expected

    def test_profile_country_to_alpha3_invalid_country(self):
        """
        A profile with an invalid country code should raise an InvalidProfileDataException
        """
        with mute_signals(post_save):
            profile = ExamProfileFactory(profile__country='XXXX')
        with self.assertRaises(InvalidProfileDataException):
            CDDWriter.profile_country_to_alpha3(profile)

    @ddt.data(
        ("+1 617 293-3423", "1", "6172933423", ),
        ("+39 345 9999999", "39", "3459999999", ),
        ("+393459999999", "39", "3459999999", ),
        ("+39 0827 99999", "39", "082799999", ),
        ("+91 020-30303030", "91", "2030303030", ),
        ("+17874061234", "1", "7874061234", ),
        ("+52-55-60-521234", "52", "5560521234", ),
        ("+229-97-09-1234", "229", "97091234", )
    )
    @ddt.unpack
    def test_profile_phone_number_functions(self, input_number, expected_country_code, expected_number):
        """
        A profile with a valid phone number should be parsed correctly
        """
        with mute_signals(post_save):
            profile = ExamProfileFactory(profile__phone_number=input_number)
        assert CDDWriter.profile_phone_number_to_raw_number(profile) == expected_number
        assert CDDWriter.profile_phone_number_to_country_code(profile) == expected_country_code

    @ddt.data(
        '',
        None,
        'bad string',
        '120272727',  # nonsense number
        '+1234567',  # number that resembles a real number
        "+1 899 293-3423",  # invalid number even if it looks fine
    )
    def test_profile_phone_number_exceptions(self, bad_number):
        """
        It should raise exceptions for bad data
        """
        with mute_signals(post_save):
            profile = ExamProfileFactory(profile__phone_number=bad_number)
        with self.assertRaises(InvalidProfileDataException):
            CDDWriter.profile_phone_number_to_raw_number(profile)
        with self.assertRaises(InvalidProfileDataException):
            CDDWriter.profile_phone_number_to_country_code(profile)

    def test_write_profiles_cdd_header(self):
        """
        Tests write_cdd_file writes the correct header
        """
        self.cdd_writer.write(self.tsv_file, [])

        assert self.tsv_value == (
            "ClientCandidateID\tFirstName\tLastName\t"
            "Email\tAddress1\tAddress2\tAddress3\t"
            "City\tState\tPostalCode\tCountry\t"
            "Phone\tPhoneCountryCode\tLastUpdate\r\n"
        )

    def test_write_cdd_file(self):
        """
        Tests cdd_writer against a set of profiles
        """
        kwargs = {
            'profile__id': 14879,
            'profile__romanized_first_name': 'Jane',
            'profile__romanized_last_name': 'Smith',
            'profile__user__email': 'jane@example.com',
            'profile__address': '1 Main St, Room B345',
            'profile__city': 'Boston',
            'profile__state_or_territory': 'US-MA',
            'profile__country': 'US',
            'profile__postal_code': '02115',
            'profile__phone_number': '+1 617 293-3423',
        }

        with mute_signals(post_save):
            exam_profiles = [ExamProfileFactory.create(**kwargs)]
            exam_profiles[0].updated_on = FIXED_DATETIME

        self.cdd_writer.write(self.tsv_file, exam_profiles)

        assert self.tsv_rows[0] == (
            "14879\tJane\tSmith\tjane@example.com\t"
            "1 Main St, Room B345\t\t\t"  # triple tab is for blank address2 and address3
            "Boston\tMA\t02115\tUSA\t"
            "6172933423\t1\t2016/05/15 15:02:55"
        )

    def test_write_cdd_file_with_blank_romanized_name(self):
        """
        Tests cdd_writer against a profile without romanized name fields
        """
        kwargs = {
            'profile__id': 9876,
            'profile__first_name': 'Jane',
            'profile__last_name': 'Smith',
            'profile__romanized_first_name': None,
            'profile__romanized_last_name': None,
            'profile__phone_number': '+1 617 293-3423',
        }

        with mute_signals(post_save):
            exam_profiles = [ExamProfileFactory.create(**kwargs)]
            exam_profiles[0].profile.updated_on = FIXED_DATETIME
        self.cdd_writer.write(self.tsv_file, exam_profiles)

        assert self.tsv_rows[0].startswith("9876\tJane\tSmith\t")


class EADWriterTest(TSVWriterTestCase, TestCase):
    """
    Tests for EADWriter
    """
    def setUp(self):
        self.ead_writer = EADWriter()
        super().setUp()

    def test_write_ead_header(self):
        """
        Tests EADWriter writes the correct header
        """
        self.ead_writer.write(self.tsv_file, [])

        assert self.tsv_header == (
            "AuthorizationTransactionType\tClientAuthorizationID\t"
            "ClientCandidateID\tExamSeriesCode\tModules\t"
            "Accommodations\tEligibilityApptDateFirst\tEligibilityApptDateLast\t"
            "LastUpdate"
        )

    def test_write_ead_file(self):
        """
        Tests that write_ead_file outputs correctly
        """
        kwargs = {
            'id': 143,
            'operation': 'add',
            'exam_run__exam_series_code': 'MM-DEDP',
            'exam_run__date_first_eligible': date(2016, 5, 15),
            'exam_run__date_last_eligible': date(2016, 10, 15),
        }

        with mute_signals(post_save):
            profile = ProfileFactory(id=14879)
            exam_auths = [ExamAuthorizationFactory.create(user=profile.user, **kwargs)]
            exam_auths[0].updated_on = FIXED_DATETIME

        self.ead_writer.write(self.tsv_file, exam_auths)

        assert self.tsv_rows[0] == (
            "add\t143\t"
            "14879\tMM-DEDP\t\t"
            "\t2016/05/15\t2016/10/15\t"  # accommodation blank intentionally
            "2016/05/15 15:02:55"
        )
