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
    def setUp(self):  # pylint: disable=missing-docstring
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

    def test_get_field_mapper(self):  # pylint: disable=no-self-use
        """
        Tests that _get_field_mapper handles input correctly
        """
        profile = Profile(address='1 Main St')

        assert BaseTSVWriter.get_field_mapper('address')(profile) == profile.address

        def get_addr1(profile):  # pylint: disable=missing-docstring
            return profile.address

        addr1_field_mapper = BaseTSVWriter.get_field_mapper(get_addr1)

        assert addr1_field_mapper == get_addr1
        assert addr1_field_mapper(profile) == profile.address1

        with self.assertRaises(TypeError):
            BaseTSVWriter.get_field_mapper([])

    def test_format_datetime(self):  # pylint: disable=no-self-use
        """
        Tests that datetimes format correctly according to Pearson spec
        """
        assert BaseTSVWriter.format_datetime(FIXED_DATETIME) == '2016/05/15 15:02:55'

    def test_format_date(self):  # pylint: disable=no-self-use
        """
        Tests that datetimes format correctly according to Pearson spec
        """
        assert BaseTSVWriter.format_date(FIXED_DATE) == '2016/05/15'

    def test_writer_init(self):  # pylint: disable=no-self-use
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

    def test_map_row_with_prefix(self):  # pylint: disable=no-self-use
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

    def test_map_row_without_prefix(self):  # pylint: disable=no-self-use
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

    def test_write(self):  # pylint: disable=no-self-use
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

    def test_write_skips_invalid_rows(self):  # pylint: disable=no-self-use
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
    def setUp(self):  # pylint: disable=missing-docstring
        self.cdd_writer = CDDWriter()
        super().setUp()

    @ddt.data(
        ("Jekyll", None, "Jekyll"),
        (None, "Hyde", "Hyde"),
        ("Jekyll", "Hyde", "Hyde"),
    )
    @ddt.unpack  # pylint: disable=no-self-use
    def test_first_name(self, unromanized, romanized, expected):
        """
        Test that the `first_name` method prefers the `romanized_first_name`
        field, and falls back on `first_name` field.
        """
        with mute_signals(post_save):
            profile = ProfileFactory(
                first_name=unromanized,
                romanized_first_name=romanized,
            )
        assert CDDWriter.first_name(profile) == expected

    @ddt.data(
        ("Jekyll", None, "Jekyll"),
        (None, "Hyde", "Hyde"),
        ("Jekyll", "Hyde", "Hyde"),
    )
    @ddt.unpack  # pylint: disable=no-self-use
    def test_last_name(self, unromanized, romanized, expected):
        """
        Test that the `last_name` method prefers the `romanized_last_name`
        field, and falls back on `last_name` field.
        """
        with mute_signals(post_save):
            profile = ProfileFactory(
                last_name=unromanized,
                romanized_last_name=romanized,
            )
        assert CDDWriter.last_name(profile) == expected

    def test_profile_country_to_alpha3_invalid_country(self):  # pylint: disable=no-self-use
        """
        A profile with an invalid country code should raise an InvalidProfileDataException
        """
        with mute_signals(post_save):
            profile = ProfileFactory(country='XXXX')
        with self.assertRaises(InvalidProfileDataException):
            CDDWriter.profile_country_to_alpha3(profile)

    def test_profile_phone_number_functions(self):  # pylint: disable=no-self-use
        """
        A profile with a valid phone number should be parsed correctly
        """
        with mute_signals(post_save):
            profile = ProfileFactory(phone_number="+1 899 293-3423")
        assert CDDWriter.profile_phone_number_to_raw_number(profile) == "899 293-3423"
        assert CDDWriter.profile_phone_number_to_country_code(profile) == "1"

    @ddt.data(
        '',
        None,
        'bad string',
        '120272727',
    )
    def test_profile_phone_number_exceptions(self, bad_number):  # pylint: disable=no-self-use
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
            'profile__state_or_territory': 'Massachusetts',
            'profile__country': 'US',
            'profile__postal_code': '02115',
            'profile__phone_number': '+1 999-999-9999',
        }

        with mute_signals(post_save):
            exam_profiles = [ExamProfileFactory.create(**kwargs)]
            exam_profiles[0].profile.updated_on = FIXED_DATETIME

        self.cdd_writer.write(self.tsv_file, exam_profiles)

        assert self.tsv_rows[0] == (
            "14879\tJane\tSmith\tjane@example.com\t"
            "1 Main St, Room B345\t\t\t"  # triple tab is for blank address2 and address3
            "Boston\tMassachusetts\t02115\tUSA\t"
            "999-999-9999\t1\t2016/05/15 15:02:55"
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
    def setUp(self):  # pylint: disable=missing-docstring
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
            'course__exam_module': 'x14.07',
            'course__program__exam_series_code': 'MM-DEDP',
            'date_first_eligible': date(2016, 5, 15),
            'date_last_eligible': date(2016, 10, 15),
        }

        with mute_signals(post_save):
            profile = ProfileFactory(id=14879)
            exam_auths = [ExamAuthorizationFactory.create(user=profile.user, **kwargs)]
            exam_auths[0].updated_on = FIXED_DATETIME

        self.ead_writer.write(self.tsv_file, exam_auths)

        assert self.tsv_rows[0] == (
            "add\t143\t"
            "14879\tMM-DEDP\tx14.07\t"
            "\t2016/05/15\t2016/10/15\t"  # accommodation blank intentionally
            "2016/05/15 15:02:55"
        )
