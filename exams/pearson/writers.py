"""
Pearson TSV writers
"""
import csv
import logging
from collections import OrderedDict
from operator import attrgetter
import re

import pycountry

from exams.pearson.constants import (
    PEARSON_DATE_FORMAT,
    PEARSON_DATETIME_FORMAT,
    PEARSON_DIALECT_OPTIONS,
)
from exams.pearson.exceptions import (
    InvalidProfileDataException,
    InvalidTsvRowException,
)

log = logging.getLogger(__name__)


class BaseTSVWriter(object):
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
        return date.strftime(PEARSON_DATE_FORMAT)

    @classmethod
    def format_datetime(cls, dt):
        """
        Formats a datetime to Pearson's required format
        """
        return dt.strftime(PEARSON_DATETIME_FORMAT)

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


def split_phone_number(num):
    """
    split a phone number into the calling code and the rest of the number
    """
    reg = re.compile(r'^\+(\d*)\s?(.*)')
    return reg.findall(num)[0]


class CDDWriter(BaseTSVWriter):
    """
    A writer for Pearson Candidate Demographic Data (CDD) files
    """

    def __init__(self):
        """
        Initializes a new CDD writer
        """
        super().__init__([
            ('ClientCandidateID', 'student_id'),
            ('FirstName', self.first_name),
            ('LastName', self.last_name),
            ('Email', 'user.email'),
            ('Address1', 'address1'),
            ('Address2', 'address2'),
            ('Address3', 'address3'),
            ('City', 'city'),
            ('State', 'state_or_territory'),
            ('PostalCode', 'postal_code'),
            ('Country', self.profile_country_to_alpha3),
            ('Phone', self.profile_phone_number_to_raw_number),
            ('PhoneCountryCode', self.profile_phone_number_to_country_code),
            ('LastUpdate', lambda profile: self.format_datetime(profile.updated_on)),
        ], field_prefix='profile')

    @classmethod
    def first_name(cls, profile):
        """
        romanized_first_name if we have it, first_name otherwise
        """
        return profile.romanized_first_name or profile.first_name

    @classmethod
    def last_name(cls, profile):
        """
        romanized_last_name if we have it, last_name otherwise
        """
        return profile.romanized_last_name or profile.last_name

    @classmethod
    def profile_phone_number_to_country_code(cls, profile):
        """
        get the country code for a profile's phone number
        """
        try:
            code, _ = split_phone_number(profile.phone_number)
        except BaseException as ex:
            raise InvalidProfileDataException() from ex
        return code

    @classmethod
    def profile_phone_number_to_raw_number(cls, profile):
        """
        get just the number for a profile's phone number
        """
        try:
            _, number = split_phone_number(profile.phone_number)
        except BaseException as ex:
            raise InvalidProfileDataException() from ex
        return number

    @classmethod
    def profile_country_to_alpha3(cls, profile):
        """
        Returns the alpha3 code of a profile's country

        Arguments:
            profile: the profile to extract the alpha3 country code from

        Returns:
            str:
                the alpha3 country code
        """
        # Pearson requires ISO-3166 alpha3 codes, but we store as alpha2
        try:
            country = pycountry.countries.get(alpha_2=profile.country)
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
            ('ExamSeriesCode', 'course.program.exam_series_code'),
            ('Modules', 'course.exam_module'),
            ('Accommodations', lambda _: ''),
            ('EligibilityApptDateFirst', lambda exam_auth: self.format_date(exam_auth.date_first_eligible)),
            ('EligibilityApptDateLast', lambda exam_auth: self.format_date(exam_auth.date_last_eligible)),
            ('LastUpdate', lambda exam_auth: self.format_datetime(exam_auth.updated_on)),
        ])
