# Generated by Django 5.2.1 on 2025-05-18 13:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_manager_ouid'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('content', models.TextField()),
                ('date', models.DateField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Resource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('url', models.URLField()),
                ('date', models.DateField(auto_now_add=True)),
                ('type', models.CharField(default='PDF', max_length=50)),
                ('size', models.CharField(default='0MB', max_length=20)),
                ('downloads', models.PositiveIntegerField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name='Update',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('content', models.TextField()),
                ('date', models.DateField(auto_now_add=True)),
            ],
        ),
        migrations.RemoveField(
            model_name='manager',
            name='ouid',
        ),
    ]
