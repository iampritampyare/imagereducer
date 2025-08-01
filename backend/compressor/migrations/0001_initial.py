# Generated by Django 4.2.7 on 2025-07-30 10:22

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="CompressedImage",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("original_image", models.ImageField(upload_to="originals/")),
                ("compressed_image", models.ImageField(upload_to="compressed/")),
                ("original_size", models.IntegerField()),
                ("compressed_size", models.IntegerField()),
                ("compression_ratio", models.FloatField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
