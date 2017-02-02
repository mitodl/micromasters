"""
Generates fake Tier and TierProgram data
"""
from django.core.management import BaseCommand

from courses.models import Program
from financialaid.factories import TierProgramFactory


def create_tiers(programs, num_tiers):
    """Given a list of Programs, creates a specified number of TierPrograms associated with each"""
    tiers_created = 0
    programs_with_tiers_created = 0
    for program in programs:
        # Create TierPrograms
        tiers_to_create_count = num_tiers - program.tier_programs.count()
        if tiers_to_create_count <= 0:
            # Program already has or has more than the specified number of TierPrograms to create
            continue
        programs_with_tiers_created += 1
        created_tier_programs = TierProgramFactory.create_batch(tiers_to_create_count, program=program)
        tiers_created += len(created_tier_programs)

        # there must be at least one TierProgram with discount_amount=0 and one with income_threshold=0
        least_income_threshold = min(
            created_tier_programs, key=lambda tier_program: tier_program.income_threshold
        )
        least_income_threshold.income_threshold = 0
        least_income_threshold.save()

        least_discount = min(
            created_tier_programs, key=lambda tier_program: tier_program.discount_amount
        )
        least_discount.discount_amount = 0
        least_discount.save()

    return programs_with_tiers_created, tiers_created


class Command(BaseCommand):
    """
    Generates fake Tier and TierProgram data
    """
    help = "Generates Tiers and TierPrograms for existing Programs without associated TierPrograms"

    def add_arguments(self, parser):
        parser.add_argument(
            "--tiers",
            dest="tiers",
            default=4,
            help="Number of TierPrograms to generate per Program.",
            type=int
        )
        parser.add_argument(
            "--program-id",
            dest="program_id",
            default=None,
            help="If this is specified, will only create Tiers and TierPrograms for the Program with this id.",
            type=int
        )
        parser.add_argument(
            "--add-to-existing",
            action="store_true",
            dest="add_to_existing",
            default=False,
            help="If this flag is passed, will also create TierPrograms for Programs with existing TierPrograms."
        )

    def handle(self, *args, **options):
        programs = Program.objects.all()
        num_tiers = int(options["tiers"])
        if options["program_id"] is not None:
            # Filter to a just the specified id
            programs = programs.filter(id=options["program_id"])
        if not options["add_to_existing"]:
            # Filter to just those that don't have any TierPrograms
            programs = programs.filter(tier_programs__isnull=True)
        programs_with_tiers_created, tiers_created = create_tiers(programs, num_tiers)
        self.stdout.write(
            "Created {tiers_created} Tiers/TierPrograms for {programs_created} Programs.".format(
                tiers_created=tiers_created,
                programs_created=programs_with_tiers_created
            )
        )
