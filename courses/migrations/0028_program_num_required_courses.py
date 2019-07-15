# Generated by Django 2.1.10 on 2019-07-15 19:04

from django.db import migrations, models


def populate_program_number(apps, schema_editor):
    Program = apps.get_model('courses', 'Program')
    for program in Program.objects.all():
        program.num_required_courses = program.course_set.count()
        program.save()


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0027_added_course_number_to_course_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='program',
            name='num_required_courses',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.RunPython(populate_program_number, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='program',
            name='num_required_courses',
            field=models.PositiveSmallIntegerField(),
        ),
    ]
