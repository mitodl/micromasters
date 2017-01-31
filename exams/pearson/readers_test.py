
"""
Tests for TSV readers
"""
import io
from collections import namedtuple
from datetime import datetime
from unittest import TestCase as UnitTestCase

import pytz

from exams.pearson.readers import (
    BaseTSVReader,
)
from exams.pearson.exceptions import InvalidTsvRowException

FIXED_DATETIME = datetime(2016, 5, 15, 15, 2, 55, tzinfo=pytz.UTC)


class BaseTSVReaderTest(UnitTestCase):
    """
    Tests for Pearson reader code
    """

    def test_parse_datetime(self):
        """
        Tests that datetimes format correctly according to Pearson spec
        """
        assert BaseTSVReader.parse_datetime('2016/05/15 15:02:55') == FIXED_DATETIME

    def test_reader_init(self):
        """
        Tests that the reader initializes correctly
        """

        PropTuple = namedtuple('PropTuple', ['prop2'])
        fields = {
            ('prop2', 'Prop2', int),
        }

        reader = BaseTSVReader(fields, PropTuple)

        assert reader.field_mappers == fields
        assert reader.read_as_cls == PropTuple

    def test_map_row(self):
        """
        Tests map_row with a prefix set
        """
        PropTuple = namedtuple('PropTuple', ['prop2'])
        reader = BaseTSVReader({
            ('Prop2', 'prop2'),
        }, PropTuple)

        row = {
            'Prop1': '12',
            'Prop2': '145',
        }

        result = reader.map_row(row)
        assert result == PropTuple(
            prop2='145',
        )
        assert isinstance(result.prop2, str)

        reader = BaseTSVReader({
            ('Prop2', 'prop2', int),
        }, PropTuple)

        row = {
            'Prop1': 12,
            'Prop2': 145,
        }

        result = reader.map_row(row)
        assert result == PropTuple(
            prop2=145,
        )
        assert isinstance(result.prop2, int)

        with self.assertRaises(InvalidTsvRowException):
            reader.map_row({})

    def test_read(self):
        """
        Tests the read method outputs correctly
        """

        PropTuple = namedtuple('PropTuple', ['prop1', 'prop2'])
        tsv_file = io.StringIO(
            "Prop1\tProp2\r\n"
            "137\t145\r\n"
        )
        reader = BaseTSVReader([
            ('Prop1', 'prop1'),
            ('Prop2', 'prop2', int),
        ], PropTuple)

        row = PropTuple(
            prop1='137',
            prop2=145,
        )

        rows = reader.read(tsv_file)

        assert rows == [row]
