# -*- coding: utf-8 -*-
# Generated by Django 1.9.8 on 2016-09-26 18:57
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financialaid', '0003_added_timestamps'),
    ]

    operations = [
        migrations.RenameField(
            model_name='financialaidaudit',
            old_name='user',
            new_name='acting_user',
        ),
        migrations.RemoveField(
            model_name='financialaidaudit',
            name='date',
        ),
        migrations.RemoveField(
            model_name='financialaidaudit',
            name='table_changed',
        ),
        migrations.AddField(
            model_name='financialaidaudit',
            name='financial_aid',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='financialaid.FinancialAid'),
        ),
    ]
