"""
Test file for create_tier management command
"""
from courses.factories import ProgramFactory
from financialaid.factories import TierProgramFactory
from financialaid.models import Tier, TierProgram
from seed_data.management.commands import create_tiers
from search.base import MockedESTestCase


class CreateTiersTest(MockedESTestCase):
    """
    Tests for create_tier management command
    """
    @classmethod
    def setUpTestData(cls):
        cls.program1 = ProgramFactory.create()
        cls.program2 = ProgramFactory.create()
        cls.command = create_tiers.Command()

    def test_create_tier_with_tiers_parameter(self):
        """
        Test creating tiers with --tiers parameter
        """
        assert Tier.objects.count() == 0
        assert TierProgram.objects.count() == 0
        self.command.handle("create_tiers", tiers=6, program_id=None, add_to_existing=False)
        assert Tier.objects.count() == 12
        assert TierProgram.objects.count() == 12

    def test_create_tier_with_program_id_parameter(self):
        """
        Test creating tiers with --program-id parameter
        """
        assert Tier.objects.count() == 0
        assert TierProgram.objects.count() == 0
        self.command.handle("create_tiers", tiers=4, program_id=self.program1.id, add_to_existing=False)
        assert TierProgram.objects.filter(program=self.program1).count() == 4
        assert TierProgram.objects.filter(program=self.program2).count() == 0

    def test_create_tier_does_not_create_for_programs_with_existing_tier_programs(self):
        """
        Test that this won't create tiers if the programs already have existing tier programs
        """
        TierProgramFactory.create(program=self.program1)
        assert TierProgram.objects.filter(program=self.program1).count() == 1
        assert TierProgram.objects.filter(program=self.program2).count() == 0
        self.command.handle("create_tiers", tiers=4, program_id=None, add_to_existing=False)
        assert TierProgram.objects.filter(program=self.program1).count() == 1
        assert TierProgram.objects.filter(program=self.program2).count() == 4

    def test_create_tier_with_add_to_existing_parameter(self):
        """
        Test that passing the --add-to-existing parameter will add to programs with existing tiers
        """
        TierProgramFactory.create(program=self.program1)
        assert TierProgram.objects.filter(program=self.program1).count() == 1
        assert TierProgram.objects.filter(program=self.program2).count() == 0
        self.command.handle("create_tiers", tiers=4, program_id=None, add_to_existing=True)
        assert TierProgram.objects.filter(program=self.program1).count() == 4  # Default is 4
        assert TierProgram.objects.filter(program=self.program2).count() == 4

    def test_zero_threshold_and_discount(self):
        """
        Test that there is one TierProgram with income_threshold=0 and one with discount_amount=0
        """
        self.command.handle("create_tiers", tiers=4, program_id=None, add_to_existing=False)
        assert 0 in TierProgram.objects.values_list('income_threshold', flat=True)
        assert 0 in TierProgram.objects.values_list('discount_amount', flat=True)
