# Generated by Django 2.2.28 on 2022-08-09 16:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ecommerce', '0018_alter_field_status_on_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='reference_number',
            field=models.CharField(max_length=255, null=True, unique=True),
        ),
    ]
