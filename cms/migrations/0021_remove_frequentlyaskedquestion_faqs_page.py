# -*- coding: utf-8 -*-
# Generated by Django 1.9.10 on 2016-10-11 21:26
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0020_add_faqs_page'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='frequentlyaskedquestion',
            name='faqs_page',
        ),
    ]
