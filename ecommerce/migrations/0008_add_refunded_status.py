# -*- coding: utf-8 -*-
# Generated by Django 1.9.10 on 2016-10-20 16:12
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ecommerce', '0007_orderaudit'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(choices=[('created', 'created'), ('fulfilled', 'fulfilled'), ('failed', 'failed'), ('refunded', 'refunded')], db_index=True, default='created', max_length=30),
        ),
    ]
