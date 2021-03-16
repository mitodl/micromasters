"""
Update FinancialAid objects with current tier program
"""
from django.core.management import BaseCommand, CommandError

from financialaid.models import FinancialAid, TierProgram


class Command(BaseCommand):
    """
    Updates the existing financial aid objects to current tier programs
    """
    help = "Updates the existing financial aid objects to current tier programs"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument

        fin_aids = FinancialAid.objects.filter(
            tier_program__current=False,
        )
        updated_count = 0
        for financial_aid in fin_aids:
            try:
                threshold = financial_aid.tier_program.income_threshold
                tier_program = TierProgram.objects.get(
                    income_threshold=threshold,
                    current=True,
                )

            except TierProgram.DoesNotExist:
                raise CommandError(
                    'Could not find a current tier program with threshold "{}"'.format(threshold)
                )
            except TierProgram.MultipleObjectsReturned:
                raise CommandError(
                    'There are multiple courses with given number "{}"'.format(threshold)
                )

            financial_aid.tier_program = tier_program
            financial_aid.save_and_log(None)
            updated_count += 1

        self.stdout.write(self.style.SUCCESS('Updated {} financial aid instances'.format(updated_count)))
