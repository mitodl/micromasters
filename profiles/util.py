"""
util functions for profiles
"""
from contextlib import contextmanager
from io import BytesIO
from os import path
from tempfile import NamedTemporaryFile

from PIL import Image

from micromasters.utils import now_in_utc

# This is the Django ImageField max path size
IMAGE_PATH_MAX_LENGTH = 100

# Max dimension of either height or width for small and medium images
IMAGE_SMALL_MAX_DIMENSION = 64
IMAGE_MEDIUM_MAX_DIMENSION = 128
COMPULSORY_FIELDS = [
    'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'gender',
    'country', 'state_or_territory', 'city', 'nationality', 'preferred_language'
]


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


def split_at_space(string, max_length=40):
    """
    Split a string into two parts. The split must occur at a whitespace
    character, and the max_length of the first part is set with the
    `max_length` argument. This is used for splitting the user's
    `address` field into `address1`, `address2`, and `address3`.
    """
    if len(string) <= max_length:
        return string, ""
    last_index = 0
    for index, char in enumerate(string):
        if char.isspace():
            if index > max_length:
                return string[0:last_index], string[last_index:]
            last_index = index
    return string[0:last_index], string[last_index:]


def _generate_upload_to_uri(suffix=""):
    """
    Returns a function to specify the upload directory and filename, via upload_to on an ImageField

    Args:
        suffix (str):
            A suffix for the filename
    Returns:
        function:
            A function to use with upload_to to specify an upload directory and filename
    """

    def _upload_to(_, filename):
        """Function passed to upload_to on an ImageField"""
        name, ext = path.splitext(filename)
        timestamp = now_in_utc().replace(microsecond=0)
        path_format = "profile/{name}-{timestamp}{suffix}{ext}"

        path_without_name = path_format.format(
            timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S-%z"),
            suffix=suffix,
            ext=ext,
            name='',
        )
        if len(path_without_name) >= IMAGE_PATH_MAX_LENGTH:
            raise ValueError("path is longer than max length even without name: {}".format(path_without_name))

        max_name_length = IMAGE_PATH_MAX_LENGTH - len(path_without_name)
        full_path = path_format.format(
            name=name[:max_name_length],
            timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S-%z"),
            suffix=suffix,
            ext=ext,
        )

        return full_path
    return _upload_to


# These two functions are referenced in migrations so be careful refactoring
def profile_image_upload_uri(instance, filename):
    """
    upload_to handler for Profile.image
    """
    return _generate_upload_to_uri()(instance, filename)


def profile_image_upload_uri_small(instance, filename):
    """
    upload_to handler for Profile.image_small
    """
    return _generate_upload_to_uri("_small")(instance, filename)


def profile_image_upload_uri_medium(instance, filename):
    """
    upload_to handler for Profile.image_medium
    """
    return _generate_upload_to_uri("_medium")(instance, filename)


def shrink_dimensions(width, height, max_dimension):
    """
    Resize dimensions so max dimension is max_dimension. If dimensions are too small no resizing is done
    Args:
        width (int): The width
        height (int): The height
        max_dimension (int): The maximum size of a dimension
    Returns:
        tuple of (small_width, small_height): A resized set of dimensions, as integers
    """
    max_width_height = max(width, height)
    if max_width_height < max_dimension:
        return width, height
    ratio = max_width_height / max_dimension

    return int(width / ratio), int(height / ratio)


def make_thumbnail(full_size_image, max_dimension):
    """
    Make a thumbnail of the image

    Args:
        full_size_image (file):
            A file-like object containing an image. This file will seek back to the beginning after being read.
        max_dimension (int):
            The max size of a dimension for the thumbnail
    Returns:
        BytesIO:
            A jpeg image which is a thumbnail of full_size_image
    """
    pil_image = Image.open(full_size_image)
    pil_image.thumbnail(shrink_dimensions(pil_image.width, pil_image.height, max_dimension), Image.ANTIALIAS)
    buffer = BytesIO()
    pil_image.convert('RGB').save(buffer, "JPEG", quality=90)
    buffer.seek(0)
    return buffer


def full_name(user):
    """
    returns users full name.

    Args:
        user (User): user object.

    Returns:
        str: full name from profile.
    """
    if not user or not user.profile:
        return None

    profile = user.profile
    first = profile.first_name or profile.user.username
    last = " {}".format(profile.last_name or '')

    return "{first_name}{last_name}".format(
        first_name=first,
        last_name=last
    )


@contextmanager
def make_temp_image_file(*, width=500, height=500):
    """
    Create a temporary PNG image to test image uploads
    """
    with NamedTemporaryFile(suffix=".png") as image_file:
        image = Image.new('RGBA', size=(width, height), color=(256, 0, 0))
        image.save(image_file, 'png')
        image_file.seek(0)
        yield image_file


def is_profile_filled_out(profile):
    """
    check if profile is filled

    Args:
        profile (Profile): User profile object
    Returns:
        bool
    """
    for field in profile._meta.get_fields():
        # is empty string
        if field.name in COMPULSORY_FIELDS and not getattr(profile, field.name):
            return False
    return True
