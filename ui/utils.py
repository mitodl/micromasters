"""ui utilities"""
from enum import Enum, unique


# Python 3.6: this should be upgraded to enum.Flag
@unique
class FeatureFlag(Enum):
    """
    FeatureFlag enum

    Members should have values of increasing powers of 2 (1, 2, 4, 8, ...)

    """
    EXAMS = 1  # DEPRECATED: unfortunately, empty enums aren't a Thing, so this has to stay for now
