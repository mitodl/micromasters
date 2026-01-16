from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('financialaid', '0018_alter_audit_nullability'),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE RULE delete_protect AS ON DELETE TO financialaid_financialaidaudit DO INSTEAD NOTHING",
            reverse_sql="DROP RULE delete_protect ON financialaid_financialaidaudit",
        ),
        migrations.RunSQL(
            sql="CREATE RULE update_protect AS ON UPDATE TO financialaid_financialaidaudit DO INSTEAD NOTHING",
            reverse_sql="DROP RULE update_protect ON financialaid_financialaidaudit",
        ),
    ]
