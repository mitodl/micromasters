"""
Find all users those have completed the non-FA program and create letters
"""
from django.core.management import BaseCommand

from courses.models import Program
from dashboard.models import ProgramEnrollment
from grades.api import generate_program_letter


class Command(BaseCommand):
    """
    Finds all users, those have completed non-FA programs and generate letter for them
    """
    help = "Finds all users those have completed the non-FA program and generate letter for them."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        programs = Program.objects.filter(live=True, financial_aid_availability=False)
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
