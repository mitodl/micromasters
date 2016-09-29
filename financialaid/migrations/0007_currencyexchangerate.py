# -*- coding: utf-8 -*-
# Generated by Django 1.9.8 on 2016-09-26 18:17
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financialaid', '0006_update_tierprogram'),
    ]

    operations = [
        migrations.CreateModel(
            name='CurrencyExchangeRate',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('updated_on', models.DateTimeField(auto_now=True)),
                ('currency_code', models.CharField(max_length=3)),
                ('exchange_rate', models.FloatField()),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
