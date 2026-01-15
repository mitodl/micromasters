from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0010_profile_agreed_to_terms_of_service'),
    ]

    operations = [
        migrations.CreateModel(
            name='Employment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('city', models.TextField()),
                ('company_name', models.TextField()),
                ('country', models.TextField()),
                ('industry', models.TextField()),
                ('state_or_territory', models.TextField(blank=True, null=True)),
                ('position', models.TextField()),
                ('end_date', models.DateField(blank=True, null=True)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='work_history', to='profiles.Profile')),
            ],
        ),
    ]
