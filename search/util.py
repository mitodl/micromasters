"""Utility functions for search"""
from contextlib import contextmanager
import json
from tempfile import NamedTemporaryFile


def traverse_mapping(mapping, parent_key):
    """
    Traverse a mapping, yielding each nested dict

    Args:
        mapping (dict): The mapping itself, or a nested dict
        parent_key (str): The key for the mapping
    Returns:
        generator: A generator of key, dict within the mapping
    """
    yield parent_key, mapping
    for key, value in mapping.items():
        if isinstance(value, dict):
            yield from traverse_mapping(value, key)


class _JsonStream:
    """
    Handles storing large amounts of newline separated JSON data
    """

    def __init__(self, file):
        self.file = file

    def write_stream(self, gen):
        """
        Write objects to the JSON file
        """
        self.file.seek(0)
        for obj in gen:
            self.file.write(json.dumps(obj))
            self.file.write("\n")

    def read_stream(self):
        """
        Reads stream of json objects from a file
        """
        self.file.seek(0)
        for line in self.file.readlines():
            yield json.loads(line)


@contextmanager
def open_json_stream():
    """
    Open a temporary file for reading and writing json objects
    """
    with NamedTemporaryFile("w+") as file:
        yield _JsonStream(file)
