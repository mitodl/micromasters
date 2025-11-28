"""Command to force resync of ExamProfiles"""

from django.core.management.base import BaseCommand

from exams.models import ExamProfile


class Command(BaseCommand):
    """Updates ExamProfile records to force a resync"""
    help = 'Updates ExamProfile records so that they resync'

    def add_arguments(self, parser):
        """Configure command args"""
        parser.add_argument(
            '--ids',
            dest='ids',
        )

    def handle(self, *args, **options):
        """Handle the command"""
        query = ExamProfile.objects.all()

        if options['ids']:
            ids = set(options['ids'].split(','))
            if len(ids) > 0:
                query = query.filter(id__in=ids)

        count = 0
        for exam_profile in query.iterator():
            exam_profile.status = ExamProfile.PROFILE_PENDING
            # save() updates updated_on, which is required to be newer for sync to be successful
            exam_profile.save()
            count += 1

        self.stdout.write(f'Updated {count} ExamProfile records')
