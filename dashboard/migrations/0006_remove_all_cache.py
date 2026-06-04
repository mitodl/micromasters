from django.db import migrations


def forwards_func(apps, schema_editor):
    """
    It deletes the cache because it will not be valid after the 0006 migration is applied
    """
    CachedEnrollment = apps.get_model("dashboard", "CachedEnrollment")
    CachedCertificate = apps.get_model("dashboard", "CachedCertificate")
    CachedCurrentGrade = apps.get_model("dashboard", "CachedCurrentGrade")
    db_alias = schema_editor.connection.alias
    CachedEnrollment.objects.using(db_alias).delete()
    CachedCertificate.objects.using(db_alias).delete()
    CachedCurrentGrade.objects.using(db_alias).delete()


def reverse_func(apps, schema_editor):
    """
    It deletes the cache because it will not be valid if the 0006 migration is reverted
    """
    CachedEnrollment = apps.get_model("dashboard", "CachedEnrollment")
    CachedCertificate = apps.get_model("dashboard", "CachedCertificate")
    CachedCurrentGrade = apps.get_model("dashboard", "CachedCurrentGrade")
    db_alias = schema_editor.connection.alias
    CachedEnrollment.objects.using(db_alias).delete()
    CachedCertificate.objects.using(db_alias).delete()
    CachedCurrentGrade.objects.using(db_alias).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("dashboard", "0005_usercacherefreshtime"),
    ]

    operations = [
        migrations.RunPython(forwards_func, reverse_func),
    ]
