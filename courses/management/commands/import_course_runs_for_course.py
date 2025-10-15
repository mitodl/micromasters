"""
"Imports" a course run from MIT Learn.

You can specify a course by its readable ID, e.g. `MITx+14.100x`.

./manage.py import_course_runs_for_course --course_id MITx+14.100x
"""

from django.core.management import BaseCommand

from courses.mit_learn_api import sync_mit_learn_courseruns_for_course, \
    fetch_course_from_mit_learn
from courses.models import Course


class Command(BaseCommand):
    """
    Creates/Updates a course with course runs using details from MIT Learn.
    You can specify a course by its readable ID, e.g. `MITxT+14.100x`.
    Usage: ./manage.py import_course_runs_for_course --course_id MITxT+14.100x
    """

    help = "Creates missing course runs and updates existing using details from MIT Learn."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--course_id",
            type=str,
            nargs="?",
            help="This should be the course key, e.g. MITxT+14.100x",
        )

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument  # noqa: C901, PLR0915
        course_id = kwargs["course_id"]
        if course_id is None:
            self.stdout.write(
                self.style.ERROR("You must provide a course_id to import all the associated course runs.")
            )
        self.stdout.write(
                self.style.SUCCESS(f"Fetching course run data from MIT Learn API for course {course_id}")
            )
        raw_course = fetch_course_from_mit_learn(course_id)

        if raw_course is None:
            self.stdout.write(
                self.style.ERROR(f"Course {course_id} not found in MIT Learn API.")
            )

        try:
            course = Course.objects.get(edx_key=course_id)
        except Course.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Course {course_id} does not exist.")
            )
            return None

        self.stdout.write(
            self.style.SUCCESS(
                f"Updating course runs for {course_id}: {course.title}"
            )
        )
        enrollment_url = raw_course.get("enrollment_url", "")

        course_runs_created = sync_mit_learn_courseruns_for_course(course, enrollment_url, raw_courseruns=raw_course["runs"])
        self.stdout.write(self.style.SUCCESS(f"{course_runs_created} course runs created"))

        return None
