from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('mail', '0002_update_audit'),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE RULE delete_protect AS ON DELETE TO mail_financialaidemailaudit DO INSTEAD NOTHING",
            reverse_sql="DROP RULE delete_protect ON mail_financialaidemailaudit",
        ),
        migrations.RunSQL(
            sql="CREATE RULE update_protect AS ON UPDATE TO mail_financialaidemailaudit DO INSTEAD NOTHING",
            reverse_sql="DROP RULE update_protect ON mail_financialaidemailaudit",
        ),
    ]
