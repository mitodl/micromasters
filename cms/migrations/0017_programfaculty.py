# -*- coding: utf-8 -*-
# Generated by Django 1.9.8 on 2016-09-19 15:29
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion
import modelcluster.fields


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0016_remove_programpage_contact_us'),
        ('wagtailimages', '0013_make_rendition_upload_callable'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProgramFaculty',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sort_order', models.IntegerField(blank=True, editable=False, null=True)),
                ('name', models.CharField(help_text='Full name of the faculty member', max_length=255)),
                ('title', models.CharField(blank=True, max_length=20)),
                ('short_bio', models.CharField(blank=True, max_length=200)),
                ('image', models.ForeignKey(blank=True, help_text='Image for the faculty member', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='wagtailimages.Image')),
            ],
            options={
                'ordering': ['sort_order'],
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='programpage',
            name='faculty_description',
            field=models.CharField(blank=True, help_text='The text to be shown as an introduction in the Faculty section', max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='programfaculty',
            name='program_page',
            field=modelcluster.fields.ParentalKey(on_delete=django.db.models.deletion.CASCADE, related_name='faculty_members', to='cms.ProgramPage'),
        ),
    ]
