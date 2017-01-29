
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
    EACReader,
    EACResult,
    VCDCReader,
    VCDCResult,
)
from exams.pearson.exceptions import InvalidTsvRowException

FIXED_DATETIME = datetime(2016, 5, 15, 15, 2, 55, tzinfo=pytz.UTC)


class BaseTSVReaderTest(UnitTestCase):
    """
    Tests for Pearson reader code
    """

    def test_parse_datetime(self):  # pylint: disable=no-self-use
        """
        Tests that datetimes format correctly according to Pearson spec
        """
        assert BaseTSVReader.parse_datetime('2016/05/15 15:02:55') == FIXED_DATETIME

    def test_reader_init(self):  # pylint: disable=no-self-use
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

    def test_map_row(self):  # pylint: disable=no-self-use
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

    def test_read(self):  # pylint: disable=no-self-use
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


class VCDCReaderTest(UnitTestCase):
    """Tests for VCDCReader"""
    def test_vcdc_read(self):  # pylint: disable=no-self-use
        """Test that read() correctly parses a VCDC file"""
        sample_data = io.StringIO(
            "ClientCandidateID\tStatus\tDate\tMessage\r\n"
            "1\tAccepted\t2016/05/15 15:02:55\t\r\n"
            "145\tAccepted\t2016/05/15 15:02:55\tWARNING: There be dragons\r\n"
            "345\tError\t2016/05/15 15:02:55\tEmpty Address\r\n"
        )

        reader = VCDCReader()
        results = reader.read(sample_data)

        assert results == [
            VCDCResult(
                client_candidate_id=1, status='Accepted', date=FIXED_DATETIME, message=''
            ),
            VCDCResult(
                client_candidate_id=145, status='Accepted', date=FIXED_DATETIME, message='WARNING: There be dragons'
            ),
            VCDCResult(
                client_candidate_id=345, status='Error', date=FIXED_DATETIME, message='Empty Address'
            ),
        ]


class EACReaderTest(UnitTestCase):
    """Tests for EACReader"""
    def test_eac_read(self):  # pylint: disable=no-self-use
        """Test that read() correctly parses a EAC file"""
        sample_data = io.StringIO(
            "ClientAuthorizationID\tClientCandidateID\tStatus\tDate\tMessage\r\n"
            "000004\t000001\tAccepted\t2016/05/15 15:02:55\t\r\n"
            "000005\t000002\tAccepted\t2016/05/15 15:02:55\tWARNING: There be dragons\r\n"
            "000006\t000003\tError\t2016/05/15 15:02:55\tEmpty Address\r\n"
        )

        reader = EACReader()
        results = reader.read(sample_data)

        assert results == [
            EACResult(
                exam_authorization_id="000004",
                candidate_id="000001",
                status='Accepted',
                message=''
            ),
            EACResult(
                exam_authorization_id="000005",
                candidate_id="000002",
                status='Accepted',
                message='WARNING: There be dragons'
            ),
            EACResult(
                exam_authorization_id="000006",
                candidate_id="000003",
                status='Error',
                message='Empty Address'
            )
        ]
