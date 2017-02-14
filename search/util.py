"""Utility functions for search"""


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
