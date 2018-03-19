# Generated by Django 2.0.2 on 2018-03-19 19:29

from django.conf import settings
import django.contrib.postgres.fields.jsonb
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('courses', '0027_added_course_number_to_course_model'),
        ('grades', '0012_combined_final_grade'),
    ]

    operations = [
        migrations.CreateModel(
            name='FACourseCertificate',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('updated_on', models.DateTimeField(auto_now=True)),
                ('hash', models.CharField(max_length=32, unique=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='courses.Course')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='FACourseCertificateAudit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('updated_on', models.DateTimeField(auto_now=True)),
                ('data_before', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('data_after', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('acting_user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('course_certificate', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='grades.FACourseCertificate')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AlterUniqueTogether(
            name='facoursecertificate',
            unique_together={('user', 'course')},
        ),
    ]
