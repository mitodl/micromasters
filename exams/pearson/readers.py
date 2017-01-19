"""
Readers for data Pearson exports
"""
import csv
from collections import namedtuple
from datetime import datetime

import pytz

from exams.pearson.constants import (
    PEARSON_DATETIME_FORMAT,
    PEARSON_DIALECT_OPTIONS,
)
from exams.pearson.exceptions import InvalidTsvRowException


class BaseTSVReader(object):
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
            Record = namedtuple('Record', ['abc', 'def'])

            BaseTSVReader([
                ('ABC', 'abc', int),
                ('DEF', 'def'),
            ], Record)

        Arguments:
            field_mappers (list(tuple)): list of tuple field mappers
            read_as_cld (cls): class to instantiate row data
        """
        self.field_mappers = field_mappers
        self.read_as_cls = read_as_cls

    @classmethod
    def parse_datetime(cls, dt):
        """
        Parses a datetime from Pearson's format
        """
        return datetime.strptime(dt, PEARSON_DATETIME_FORMAT).replace(tzinfo=pytz.UTC)

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
        kwargs = dict(self.map_cell(row, *mapper) for mapper in self.field_mappers)

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

        return [self.map_row(row) for row in file_reader]


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
            ('Date', 'date', self.parse_datetime),
            ('Message', 'message'),
        ], VCDCResult)
