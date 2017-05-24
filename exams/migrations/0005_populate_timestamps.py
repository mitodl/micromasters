# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-04-19 13:44
from __future__ import unicode_literals
from datetime import datetime

from django.db import migrations
from django.db.models import Q
import pytz


def populate_created_updated(apps, schema_editor):
    """Generate created_on and updated_on values for ExamProfile"""
    ExamProfile = apps.get_model('exams', 'ExamProfile')
    for exam_profile in ExamProfile.objects.filter(
            Q(created_on__isnull=True) | Q(updated_on__isnull=True)
    ).iterator():
        exam_profile.created_on = datetime(2017, 3, 1, tzinfo=pytz.UTC)  # ExamProfile records created for the beta
        exam_profile.save()  # updated_on populated by virtue of auto_now=True


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0004_add_timestamps'),
    ]

    operations = [
        migrations.RunPython(populate_created_updated, reverse_code=migrations.RunPython.noop),
    ]
