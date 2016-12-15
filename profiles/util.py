"""
util functions for profiles
"""
from datetime import datetime
from os import path

import pytz

IMAGE_FILENAME_MAX_LENGTH = 64


def split_name(name):
    """
    Split a name into two names. If there is only one name, the last name will be
    empty. If there are more than two, the extra names will be appended to the last
    name.

    Args:
        name (str): A name to split into first name, last name
    Returns:
        tuple: (first, last)
    """
    if name is None:
        return "", ""
    names = name.split(maxsplit=1)
    if len(names) == 0:
        return "", ""
    else:
        return names[0], " ".join(names[1:])


def profile_image_upload_uri(_, filename):
    """
    Helper to format the uri for the profile image upload
    """
    name, ext = path.splitext(filename)
    timestamp = datetime.now(pytz.utc).replace(microsecond=0)

    return "profile/{name}-{timestamp}{ext}".format(
        name=name[:IMAGE_FILENAME_MAX_LENGTH],
        timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S-%z"),
        ext=ext,
    )
