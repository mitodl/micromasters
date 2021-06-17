# Generated by Django 2.2.21 on 2021-06-15 06:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0010_micromasterslearnerrecordshare'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='programenrollment',
            name='hash',
        ),
        migrations.AddField(
            model_name='programenrollment',
            name='share_hash',
            field=models.CharField(max_length=36, null=True, unique=True),
        ),
    ]