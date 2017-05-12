# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import django.contrib.postgres.fields.jsonb
from django.db import migrations


def remove_percolate_queries(apps, schema_editor):
    """
    Remove existing PercolateQuery instances. At this point there are none which need to be preserved.
    """
    PercolateQuery = apps.get_model('search', 'PercolateQuery')
    PercolateQuery.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('search', '0002_percolatequery_original_query'),
    ]

    operations = [
        migrations.RunPython(remove_percolate_queries, migrations.RunPython.noop),
    ]
