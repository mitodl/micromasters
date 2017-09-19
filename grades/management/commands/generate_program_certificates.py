"""
Find all users that completed the program and create certificates
"""
from django.core.management import BaseCommand

from courses.models import Program
from dashboard.models import ProgramEnrollment
from grades.api import generate_program_certificate


class Command(BaseCommand):
    """
    Finds all completed FA programs
    """
    help = "Finds all users that completed the program"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        programs = Program.objects.filter(live=True, financial_aid_availability=True)
        for program in programs:
            if program.has_frozen_grades_for_all_courses():
                enrollments = ProgramEnrollment.objects.filter(program=program)
                for enrollment in enrollments:
                    generate_program_certificate(enrollment.user, program)
