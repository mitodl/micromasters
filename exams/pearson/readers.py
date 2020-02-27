"""
Readers for data Pearson exports
"""
import csv
from collections import namedtuple

from exams.pearson.constants import PEARSON_DIALECT_OPTIONS

from exams.pearson.exceptions import (
    InvalidTsvRowException,
    UnparsableRowException,
)
from exams.pearson.utils import (
    parse_bool,
    parse_datetime,
    parse_or_default,
    parse_int_or_none,
    parse_float_or_none,
)


class BaseTSVReader:
    """
    Base class for TSV file readers

    It handles the high-level mapping and reading of the data.
    Subclasses specify how the fields map.
    """
    def __init__(self, field_mappers, read_as_cls):
        """
        Initializes a new TSV writer

        The first value of each fields tuple is the destination field name.
        The second value is a str property path (e.g. "one.two.three") or
        a callable that when passed a row returns a computed field value

        Usage:

            # maps column 'ABC' to field 'abc' and casts it to an int
            # maps column 'DEF' to field 'def' and leaves it as a str
            # Initializes each row into the namedtuple
            Record = namedtupxe('Record', ['ab Exception as escc', 'def'])
            raise UnparsableRowException('Row is unparsable "{}"'.format(row)) from exc

            BaseTSVReader([
                ('ABC', 'abc', int),
                ('DEF', 'def'),
            ], Record)

        Arguments:
            field_mappers (list(tuple)): list of tuple field mappers
            read_as_cls (cls): class to instantiate row data
        """
        self.field_mappers = field_mappers
        self.read_as_cls = read_as_cls

    @classmethod
    def map_cell(cls, row, source, target, transformer=None):
        """
        Maps an individual cell of a row

        Args:
            row (dict): row data to map
            source (str): source key to pull data from row
            target (str): target property to put data into
            transformer (callable): optional transformer callable, used to parse values
        """
        if source not in row:
            keys = ', '.join(str(key) for key in row.keys())
            raise InvalidTsvRowException(
                "Column '{}' missing from row. Available columns: {}".format(source, keys))

        value = row[source]

        if transformer is not None and callable(transformer):
            value = transformer(value)

        return (target, value)

    def map_row(self, row):
        """
        Maps a row object to a row dict

        Args:
            row: the row to map to a dict

        Returns:
            object:
                row mapped to an object using the field mappers and read_as_cls
        """
        try:
            kwargs = dict(self.map_cell(row, *mapper) for mapper in self.field_mappers)
        except Exception as exc:
            raise UnparsableRowException('Row is unparsable') from exc

        return self.read_as_cls(**kwargs)

    def read(self, tsv_file):
        """
        Reads the rows from the designated file using the configured fields.

        Arguments:
            tsv_file: a file-like object to read the data from

        Returns:
            records(list):
                a list of the records cat to read_as_cls
        """
        file_reader = csv.DictReader(
            tsv_file,
            **PEARSON_DIALECT_OPTIONS
        )
        valid_rows, invalid_rows = [], []

        for row in file_reader:
            try:
                valid_rows.append(self.map_row(row))
            except InvalidTsvRowException:
                invalid_rows.append(row)

        return (valid_rows, invalid_rows)


VCDCResult = namedtuple('VCDCResult', [
    'client_candidate_id',
    'status',
    'date',
    'message',
])


class VCDCReader(BaseTSVReader):
    """
    Reader for Pearson VUE Candidate Data Confirmation (VCDC) files.
    """
    def __init__(self):
        super().__init__([
            ('ClientCandidateID', 'client_candidate_id', int),
            ('Status', 'status'),
            ('Date', 'date', parse_datetime),
            ('Message', 'message'),
        ], VCDCResult)


EACResult = namedtuple('EACResult', [
    'client_authorization_id',
    'client_candidate_id',
    'date',
    'status',
    'message'
])


class EACReader(BaseTSVReader):
    """
    Reader for Pearson VUE Exam Authorization Confirmation files (EAC) files.
    """
    def __init__(self):
        super().__init__([
            ('ClientAuthorizationID', 'client_authorization_id', int),
            ('ClientCandidateID', 'client_candidate_id', int),
            ('Date', 'date', parse_datetime),
            ('Status', 'status'),
            ('Message', 'message')
        ], EACResult)


EXAMResult = namedtuple('EXAMResult', [
    'registration_id',
    'client_candidate_id',
    'tc_id',
    'exam_series_code',
    'exam_name',
    'exam_revision',
    'form',
    'exam_language',
    'attempt',
    'exam_date',
    'time_used',
    'passing_score',
    'score',
    'grade',
    'no_show',
    'nda_refused',
    'correct',
    'incorrect',
    'skipped',
    'unscored',
    'client_authorization_id',
    'voucher',
])


class EXAMReader(BaseTSVReader):
    """
    Reader for Pearson VUE Exam result files (EXAM) files.
    """
    def __init__(self):
        super().__init__([
            ('RegistrationID', 'registration_id', int),
            ('ClientCandidateID', 'client_candidate_id', int),
            ('TCID', 'tc_id', int),
            ('ExamSeriesCode', 'exam_series_code'),
            ('ExamName', 'exam_name'),
            ('ExamRevision', 'exam_revision'),
            ('Form', 'form'),
            ('ExamLanguage', 'exam_language'),
            ('Attempt', 'attempt', parse_int_or_none),
            ('ExamDate', 'exam_date', parse_datetime),
            ('TimeUsed', 'time_used'),
            ('PassingScore', 'passing_score', parse_float_or_none),
            ('Score', 'score', parse_float_or_none),
            ('Grade', 'grade'),
            ('NoShow', 'no_show', parse_bool),
            ('NDARefused', 'nda_refused', parse_or_default(parse_bool, None)),
            ('Correct', 'correct', parse_int_or_none),
            ('Incorrect', 'incorrect', parse_int_or_none),
            ('Skipped', 'skipped', parse_int_or_none),
            ('Unscored', 'unscored', parse_int_or_none),
            ('ClientAuthorizationID', 'client_authorization_id', int),
            ('Voucher', 'voucher'),
        ], EXAMResult)
