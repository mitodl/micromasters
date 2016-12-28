# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from uuid import uuid4

from django.db import migrations, models
from profiles.util import (
    IMAGE_SMALL_MAX_DIMENSION,
    make_thumbnail,
)


def populate_image_small(apps, schema_editor):
    """
    Populate image_small with thumbnail of image if it exists
    """
    Profile = apps.get_model('profiles.Profile')
    for profile in Profile.objects.all():
        if profile.image and not profile.image_small:
            try:
                thumbnail = make_thumbnail(profile.image.file, IMAGE_SMALL_MAX_DIMENSION)
                profile.image_small.save("{}.jpg".format(uuid4().hex), thumbnail)
            except OSError:
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0024_add_image_small'),
    ]

    operations = [
        migrations.RunPython(populate_image_small, reverse_code=lambda apps, schema_editor: None),
    ]
