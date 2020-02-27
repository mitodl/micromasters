"""
Pearson TSV writers
"""
import csv
import logging
from collections import OrderedDict
from operator import attrgetter

import phonenumbers
import pycountry

from exams.pearson.constants import (
    PEARSON_DEFAULT_DATE_FORMAT,
    PEARSON_DEFAULT_DATETIME_FORMAT,
    PEARSON_DIALECT_OPTIONS,
    PEARSON_STATE_SUPPORTED_COUNTRIES,
)
from exams.pearson.exceptions import (
    InvalidProfileDataException,
    InvalidTsvRowException,
)

log = logging.getLogger(__name__)


class BaseTSVWriter:
    """
    Base class for TSV file writers.

    It handles the high-level mapping and writing of the data.
    Subclasses specify how the fields map.
    """
    def __init__(self, fields, field_prefix=None):
        """
        Initializes a new TSV writer

        The first value of each fields tuple is the destination field name.
        The second value is a str property path (e.g. "one.two.three") or
        a callable that when passed a row returns a computed field value

        Arguments:
            fields (List): list of (str, str|callable) tuples
            field_prefix (str): path prefix to prefix field lookups with
        """
        self.fields = OrderedDict(fields)
        self.columns = self.fields.keys()
        self.field_mappers = {column: self.get_field_mapper(field) for (column, field) in fields}
        self.prefix_mapper = attrgetter(field_prefix) if field_prefix is not None else None

    @classmethod
    def format_date(cls, date):
        """
        Formats a date to Pearson's required format
        """
        return date.strftime(PEARSON_DEFAULT_DATE_FORMAT)

    @classmethod
    def format_datetime(cls, dt):
        """
        Formats a datetime to Pearson's required format
        """
        return dt.strftime(PEARSON_DEFAULT_DATETIME_FORMAT)

    @classmethod
    def get_field_mapper(cls, field):
        """
        Returns a field mapper, accepts either a property path in str form or a callable
        """
        if isinstance(field, str):
            return attrgetter(field)
        elif callable(field):
            return field
        else:
            raise TypeError("field_mapper must be a str or a callable")

    def map_row(self, row):
        """
        Maps a row object to a row dict

        Args:
            row: the row to map to a dict

        Returns:
            dict:
                row mapped to a dict using the field mappers
        """
        if self.prefix_mapper is not None:
            row = self.prefix_mapper(row)
        return {column: field_mapper(row) for column, field_mapper in self.field_mappers.items()}

    def write(self, tsv_file, rows):
        """
        Writes the rows to the designated file using the configured fields.

        Invalid records are not written.

        Arguments:
            tsv_file: a file-like object to write the data to
            rows: list of records to write to the tsv file

        Returns:
            (valid_record, invalid_records):
                a tuple of which records were valid or invalid
        """
        file_writer = csv.DictWriter(
            tsv_file,
            self.columns,
            restval='',  # ensure we don't print 'None' into the file for optional fields
            **PEARSON_DIALECT_OPTIONS
        )

        file_writer.writeheader()

        valid_rows, invalid_rows = [], []

        for row in rows:
            try:
                file_writer.writerow(self.map_row(row))
                valid_rows.append(row)
            except InvalidTsvRowException:
                log.exception("Invalid tsv row")
                invalid_rows.append(row)

        return (valid_rows, invalid_rows)


class CDDWriter(BaseTSVWriter):
    """
    A writer for Pearson Candidate Demographic Data (CDD) files
    """

    def __init__(self):
        """
        Initializes a new CDD writer
        """
        super().__init__([
            ('ClientCandidateID', 'profile.student_id'),
            ('FirstName', self.first_name),
            ('LastName', self.last_name),
            ('Email', 'profile.user.email'),
            ('Address1', 'profile.address1'),
            ('Address2', 'profile.address2'),
            ('Address3', 'profile.address3'),
            ('City', 'profile.city'),
            ('State', self.profile_state),
            ('PostalCode', 'profile.postal_code'),
            ('Country', self.profile_country_to_alpha3),
            ('Phone', self.profile_phone_number_to_raw_number),
            ('PhoneCountryCode', self.profile_phone_number_to_country_code),
            ('LastUpdate', lambda exam_profile: self.format_datetime(exam_profile.updated_on)),
        ])

    @classmethod
    def first_name(cls, exam_profile):
        """
        Determines which first_name to use

        Args:
            exam_profile (exams.models.ExamProfile): the ExamProfile being written

        Returns:
            str: romanized_first_name if we have it, first_name otherwise
        """
        return exam_profile.profile.romanized_first_name or exam_profile.profile.first_name

    @classmethod
    def last_name(cls, exam_profile):
        """
        Determines which last_name to use

        Args:
            exam_profile (exams.models.ExamProfile): the ExamProfile being written

        Returns:
            str: romanized_last_name if we have it, last_name otherwise
        """
        return exam_profile.profile.romanized_last_name or exam_profile.profile.last_name

    @classmethod
    def profile_state(cls, exam_profile):
        """
        Transforms the state into the format accepted by PEARSON

        Args:
            exam_profile (exams.models.ExamProfile): the ExamProfile being written

        Returns:
            str: 2-character state representation if country is US/CA otherwise None
        """
        country, state = exam_profile.profile.country_subdivision

        return state if country in PEARSON_STATE_SUPPORTED_COUNTRIES else ''

    @classmethod
    def _parse_phone_number(cls, phone_number_string):
        """
        Parses a phone number string and raises proper exceptions in case it is invalid

        Args:
            phone_number_string (str): a string representing a phone number

        Returns:
            phonenumbers.phonenumber.PhoneNumber: a PhoneNumber object
        """
        try:
            phone_number = phonenumbers.parse(phone_number_string)
        except phonenumbers.phonenumberutil.NumberParseException:
            raise InvalidProfileDataException('Stored phone number is in an invalid string')
        if not phonenumbers.is_valid_number(phone_number):
            raise InvalidProfileDataException('Stored phone number is in an invalid phone number')
        return phone_number

    @classmethod
    def profile_phone_number_to_country_code(cls, exam_profile):
        """
        Get the country code for a profile's phone number

        Args:
            exam_profile (exams.models.ExamProfile): the ExamProfile being written

        Returns:
            str: the country code
        """
        phone_number = cls._parse_phone_number(exam_profile.profile.phone_number)
        return str(phone_number.country_code)

    @classmethod
    def profile_phone_number_to_raw_number(cls, exam_profile):
        """
        Get just the number for a profile's phone number

        Args:
            exam_profile (exams.models.ExamProfile): the ExamProfile being written

        Returns:
            str: full phone number minus the country code
        """
        phone_number = cls._parse_phone_number(exam_profile.profile.phone_number)
        return phonenumbers.national_significant_number(phone_number)

    @classmethod
    def profile_country_to_alpha3(cls, exam_profile):
        """
        Returns the alpha3 code of a profile's country

        Arguments:
            exam_profile (exams.models.ExamProfile): the ExamProfile being written

        Returns:
            str:
                the alpha3 country code
        """
        # Pearson requires ISO-3166 alpha3 codes, but we store as alpha2
        try:
            country = pycountry.countries.get(alpha_2=exam_profile.profile.country)
        except KeyError as exc:
            raise InvalidProfileDataException() from exc
        return country.alpha_3


class EADWriter(BaseTSVWriter):
    """
    A writer for Pearson Exam Authorization Data (EAD) files
    """

    def __init__(self):
        """
        Initializes a new EAD writer
        """
        super().__init__([
            ('AuthorizationTransactionType', 'operation'),
            ('ClientAuthorizationID', 'id'),
            ('ClientCandidateID', 'user.profile.student_id'),
            ('ExamSeriesCode', 'exam_run.exam_series_code'),
            ('Modules', lambda _: ''),
            ('Accommodations', lambda _: ''),
            ('EligibilityApptDateFirst', lambda exam_auth: self.format_date(exam_auth.exam_run.date_first_eligible)),
            ('EligibilityApptDateLast', lambda exam_auth: self.format_date(exam_auth.exam_run.date_last_eligible)),
            ('LastUpdate', lambda exam_auth: self.format_datetime(exam_auth.updated_on)),
        ])
