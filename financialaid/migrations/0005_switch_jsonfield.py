# -*- coding: utf-8 -*-
# Generated by Django 1.9.8 on 2016-09-28 18:29
from __future__ import unicode_literals

import django.contrib.postgres.fields.jsonb
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financialaid', '0004_modified_financial_aid_audit'),
    ]

    operations = [
        migrations.AlterField(
            model_name='financialaidaudit',
            name='data_after',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True),
        ),
        migrations.AlterField(
            model_name='financialaidaudit',
            name='data_before',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True),
        ),
    ]
