# Generated by Django 2.1.11 on 2020-01-29 10:38

from django.db import migrations
import wagtail.core.blocks
import wagtail.core.fields
import wagtail.images.blocks


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0045_courseteam_title'),
    ]

    operations = [
        migrations.AlterField(
            model_name='courseteamtabpage',
            name='administrators',
            field=wagtail.core.fields.StreamField([('administrator', wagtail.core.blocks.StructBlock([('name', wagtail.core.blocks.CharBlock(help_text='Name of the course team member.', max_length=100)), ('title', wagtail.core.blocks.RichTextBlock(blank=True, help_text='Title of the course team member.', null=True)), ('bio', wagtail.core.blocks.TextBlock(help_text='Short bio of course team member.')), ('image', wagtail.images.blocks.ImageChooserBlock(help_text='Image for the faculty member. Should be 385px by 385px.'))]))], blank=True),
        ),
        migrations.AlterField(
            model_name='courseteamtabpage',
            name='contributors',
            field=wagtail.core.fields.StreamField([('contributor', wagtail.core.blocks.StructBlock([('name', wagtail.core.blocks.CharBlock(help_text='Name of the course team member.', max_length=100)), ('title', wagtail.core.blocks.RichTextBlock(blank=True, help_text='Title of the course team member.', null=True)), ('bio', wagtail.core.blocks.TextBlock(help_text='Short bio of course team member.')), ('image', wagtail.images.blocks.ImageChooserBlock(help_text='Image for the faculty member. Should be 385px by 385px.'))]))], blank=True),
        ),
        migrations.AlterField(
            model_name='courseteamtabpage',
            name='instructors',
            field=wagtail.core.fields.StreamField([('instructors', wagtail.core.blocks.StructBlock([('name', wagtail.core.blocks.CharBlock(help_text='Name of the course team member.', max_length=100)), ('title', wagtail.core.blocks.RichTextBlock(blank=True, help_text='Title of the course team member.', null=True)), ('bio', wagtail.core.blocks.TextBlock(help_text='Short bio of course team member.')), ('image', wagtail.images.blocks.ImageChooserBlock(help_text='Image for the faculty member. Should be 385px by 385px.'))]))], blank=True),
        ),
        migrations.AlterField(
            model_name='courseteamtabpage',
            name='teaching_assistants',
            field=wagtail.core.fields.StreamField([('TAs', wagtail.core.blocks.StructBlock([('name', wagtail.core.blocks.CharBlock(help_text='Name of the course team member.', max_length=100)), ('title', wagtail.core.blocks.RichTextBlock(blank=True, help_text='Title of the course team member.', null=True)), ('bio', wagtail.core.blocks.TextBlock(help_text='Short bio of course team member.')), ('image', wagtail.images.blocks.ImageChooserBlock(help_text='Image for the faculty member. Should be 385px by 385px.'))]))], blank=True),
        ),
    ]
