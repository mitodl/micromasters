"""Management command to attach avatars to profiles"""
from tempfile import NamedTemporaryFile

from django.core.management import BaseCommand
from robohash import Robohash

from profiles.models import Profile


class Command(BaseCommand):
    """
    Seed the database with a set of realistic data, for development purposes.
    """
    help = "Attach avatars to profiles"

    def add_arguments(self, parser):
        parser.add_argument(
            "--name-prefix",
            dest="name_prefix",
            help="username prefix to user",
            required=True,
        )

    def handle(self, *args, **options):
        profile_queryset = Profile.objects.filter(user__username__startswith=options['name_prefix'])
        self.stdout.write("Attaching robot avatars to {} profiles...".format(profile_queryset.count()))

        for count, profile in enumerate(profile_queryset):
            name = "{}.jpg".format(profile.user.username)
            robohash = Robohash(name)
            roboset = robohash.sets[0]
            robohash.assemble(roboset=roboset)

            with NamedTemporaryFile() as f:
                robohash.img.save(f, format='jpeg')
                f.seek(0)
                profile.image.save(name, f)
            profile.save(update_thumbnails=True)

            if count % 10 == 0:
                self.stdout.write("Updated {} profiles...".format(count))

        self.stdout.write("Done updating profiles!")
