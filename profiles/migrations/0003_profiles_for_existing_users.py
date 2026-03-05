"""
Create Profiles for existing Users
"""


from django.conf import settings
from django.db import migrations, models


def create_profiles(apps, schema_editor):
    """
    Create Profiles for all users that do't have it
    """
    Users = apps.get_model("auth", "User")
    Profile = apps.get_model("profiles", "Profile")

    for user in Users.objects.all():
        if not hasattr(user, 'profile'):
            Profile.objects.create(user=user)


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0002_fields_modified'),
    ]

    operations = [
        migrations.RunPython(create_profiles)
    ]
