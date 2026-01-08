# Generated manually on 2026-01-14

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0037_discontinued_course_runs'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='program',
            name='financial_aid_availability',
        ),
    ]
