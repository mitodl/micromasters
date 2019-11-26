"""
Finds users that have passed all courses in non-FA programs and generates commendation letters for them
"""
from django.core.management import BaseCommand

from courses.models import Program
from dashboard.models import ProgramEnrollment
from grades.api import generate_program_letter


class Command(BaseCommand):
    """
    For each program enrollment checks if the user passed the program and generates commendation letters for them.
    """
    help = "Finds users that have passed all courses in programs and generates commendation letters for them."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        programs = Program.objects.filter(live=True)
        for program in programs:
            if not program.has_frozen_grades_for_all_courses():
                self.stdout.write(
                    "Program '{}' has courses without frozen grades. Skipping program letter generation...".format(
                        program.title)
                )
                continue
            enrollments = ProgramEnrollment.objects.filter(program=program).select_related('user')
            for enrollment in enrollments:
                generate_program_letter(enrollment.user, program)
