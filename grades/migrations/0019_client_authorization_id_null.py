# Generated by Django 2.2.24 on 2021-06-29 13:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grades', '0018_remove_max_validation_final_grade'),
    ]

    operations = [
        migrations.AlterField(
            model_name='proctoredexamgrade',
            name='client_authorization_id',
            field=models.TextField(blank=True, null=True),
        ),
    ]
