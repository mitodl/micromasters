# Modified: Removed FinancialAidEmailAudit protection rules (financialaid app removed)
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('mail', '0002_update_audit'),
    ]

    operations = []
