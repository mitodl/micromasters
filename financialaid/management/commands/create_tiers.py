"""
Generates fake Tier and TierProgram data
"""
from django.core.management import BaseCommand

from courses.models import Program
from financialaid.factories import TierProgramFactory


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
        if options["program_id"] is not None:
            # Filter to a just the specified id
            programs = programs.filter(id=options["program_id"])
        if not options["add_to_existing"]:
            # Filter to just those that don't have any TierPrograms
            programs = programs.filter(tier_programs__isnull=True)

        tiers_created = 0
        programs_with_tiers_created = 0
        for program in programs:
            # Create TierPrograms
            tiers_to_create_count = int(options["tiers"]) - program.tier_programs.count()
            if tiers_to_create_count <= 0:
                # Program already has or has more than the specified number of TierPrograms to create
                continue
            programs_with_tiers_created += 1
            for _ in range(tiers_to_create_count):
                TierProgramFactory.create(
                    program=program
                )
                tiers_created += 1

        self.stdout.write(
            "Created {tiers_created} Tiers/TierPrograms for {programs_created} Programs.".format(
                tiers_created=tiers_created,
                programs_created=programs_with_tiers_created
            )
        )
