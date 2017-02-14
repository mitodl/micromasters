"""
Tests for utilty functions
"""
from collections import OrderedDict
from unittest import TestCase

from search.util import traverse_mapping


class UtilTests(TestCase):
    """
    Tests for utility functions
    """

    def test_traverse_mapping(self):
        """
        Make sure traverse_mapping is actually iterating over all nodes
        """
        data = {
            "user": {
                "properties": OrderedDict([
                    ("certificates", {
                        "type": "nested",
                        "properties": {
                            "long_field": {
                                "type": "long"
                            }
                        }
                    }),
                    ("string_field", {
                        "type": "string"
                    })
                ])
            }
        }
        assert list(traverse_mapping(data, "root")) == [
            ("root", data),
            ('user', data['user']),
            ('properties', data['user']['properties']),
            ('certificates', data['user']['properties']['certificates']),
            ('properties', data['user']['properties']['certificates']['properties']),
            ('long_field', data['user']['properties']['certificates']['properties']['long_field']),
            ('string_field', data['user']['properties']['string_field']),
        ]
