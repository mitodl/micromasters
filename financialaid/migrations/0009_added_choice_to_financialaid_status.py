# -*- coding: utf-8 -*-
# Generated by Django 1.9.8 on 2016-09-28 23:32
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financialaid', '0008_financialaid_date_documents_sent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='financialaid',
            name='date_documents_sent',
            field=models.DateField(null=True),
        ),
        migrations.AlterField(
            model_name='financialaid',
            name='status',
            field=models.CharField(choices=[('created', 'created'), ('approved', 'approved'), ('auto-approved', 'auto-approved'), ('rejected', 'rejected'), ('pending-docs', 'pending-docs'), ('docs-sent', 'docs-sent'), ('pending-manual-approval', 'pending-manual-approval')], default='created', max_length=30),
        ),
    ]
