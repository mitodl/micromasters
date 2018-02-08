"""
Tests for utilty functions
"""
from collections import OrderedDict

from search.util import (
    open_json_stream,
    traverse_mapping,
)


def test_traverse_mapping():
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


def test_json_stream():
    """
    We should be able to store and read an arbitrary number of JSON objects
    """
    objs = [1, "2", False, None, {}, {"x": {"y": ["z\n\n"]}}]
    with open_json_stream() as stream:
        assert list(stream.read_stream()) == []

        stream.write_stream(objs)

        assert list(stream.read_stream()) == objs
        assert list(stream.read_stream()) == objs

        stream.write_stream([])
