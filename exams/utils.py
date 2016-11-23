"""
Utilities for exams
"""

def strip_non_cp_1252_chars(source):
    """
    Returns a new string with characters outside the CP-1252 charset stripped
    """
    return source \
            .encode('cp1252', 'ignore') \
            .decode('utf-8')
