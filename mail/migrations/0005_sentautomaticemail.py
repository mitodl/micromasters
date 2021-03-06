# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-03-06 15:34
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('mail', '0004_automaticemail'),
    ]

    operations = [
        migrations.CreateModel(
            name='SentAutomaticEmail',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('updated_on', models.DateTimeField(auto_now=True)),
                ('automatic_email', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='mail.AutomaticEmail')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='sentautomaticemail',
            unique_together=set([('user', 'automatic_email')]),
        ),
    ]
