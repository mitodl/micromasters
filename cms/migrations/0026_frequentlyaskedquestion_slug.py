# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2016-12-21 19:26
from __future__ import unicode_literals

from django.db import migrations, models

from django.utils.text import slugify


def gen_unique_slug(apps, schema_editor):
    FrequentlyAskedQuestion = apps.get_model('cms', 'FrequentlyAskedQuestion')
    for row in FrequentlyAskedQuestion.objects.all():
        if not row.slug:
            slug = orig_slug = slugify(row.question)
            slug_is_unique = not FrequentlyAskedQuestion.objects.filter(slug=orig_slug).exists()
            count = 1
            while not slug_is_unique:
                slug = "{orig}-{count}".format(orig=orig_slug, count=count)
                slug_is_unique = not FrequentlyAskedQuestion.objects.filter(slug=slug).exists()
                count += 1
            row.slug = slug
            row.save()


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0025_infolinks'),
    ]

    operations = [
        # First add a new field for slug
        migrations.AddField(
            model_name='frequentlyaskedquestion',
            name='slug',
            field=models.SlugField(default=None, null=True),
        ),
        # Then populate existing rows with unique slugs
        migrations.RunPython(gen_unique_slug, reverse_code=migrations.RunPython.noop),
        # Now can make this field unique
        migrations.AlterField(
            model_name='frequentlyaskedquestion',
            name='slug',
            field=models.SlugField(blank=True, default=None, unique=True),
        ),
    ]
