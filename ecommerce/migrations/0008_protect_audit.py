from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ecommerce', '0007_orderaudit'),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE RULE delete_protect AS ON DELETE TO ecommerce_orderaudit DO INSTEAD NOTHING",
            reverse_sql="DROP RULE delete_protect ON ecommerce_orderaudit",
        ),
        migrations.RunSQL(
            sql="CREATE RULE update_protect AS ON UPDATE TO ecommerce_orderaudit DO INSTEAD NOTHING",
            reverse_sql="DROP RULE update_protect ON ecommerce_orderaudit",
        ),
    ]
