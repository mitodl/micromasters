import json

from django.db import migrations
from django.utils.text import slugify


TRADEMARK_ATTRIBUTION_TEXT = (
    "<p><em>MIT is an authorized licensee of the MicroMasters\u00ae mark, "
    "which is a registered trademark of Axim Collaborative.</em></p>"
)

TOS_SLUGS = ["terms_of_service", "terms-of-service"]

SECTION_6_SLUG = "6-logos-trademarks-and-use-of-name"


def add_trademark_attribution(apps, schema_editor):
    """
    Append the MicroMasters trademark attribution sentence to Section 6
    (Logos, Trademarks, and Use of Name) of the Terms of Service ResourcePage.
    """
    from django.db import connection

    page_id = None
    with connection.cursor() as cursor:
        for slug in TOS_SLUGS:
            cursor.execute(
                "SELECT id FROM wagtailcore_page WHERE slug = %s",
                [slug],
            )
            row = cursor.fetchone()
            if row:
                page_id = row[0]
                break

    if page_id is None:
        # Terms of Service page doesn't exist in this environment; nothing to do.
        return

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT content FROM cms_resourcepage WHERE page_ptr_id = %s",
            [page_id],
        )
        row = cursor.fetchone()

    if row is None:
        # The page exists in wagtailcore_page but not as a ResourcePage; skip.
        return

    content = json.loads(row[0])
    updated = False

    for block in content:
        value = block.get("value", {})
        heading = value.get("heading", "")
        if slugify(heading) == SECTION_6_SLUG:
            detail = value.get("detail", "")
            if TRADEMARK_ATTRIBUTION_TEXT not in detail:
                value["detail"] = detail + TRADEMARK_ATTRIBUTION_TEXT
                updated = True
            break

    if updated:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE cms_resourcepage SET content = %s WHERE page_ptr_id = %s",
                [json.dumps(content), page_id],
            )


def remove_trademark_attribution(apps, schema_editor):
    """
    Reverse: remove the trademark attribution sentence from Section 6
    of the Terms of Service ResourcePage.
    """
    from django.db import connection

    page_id = None
    with connection.cursor() as cursor:
        for slug in TOS_SLUGS:
            cursor.execute(
                "SELECT id FROM wagtailcore_page WHERE slug = %s",
                [slug],
            )
            row = cursor.fetchone()
            if row:
                page_id = row[0]
                break

    if page_id is None:
        return

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT content FROM cms_resourcepage WHERE page_ptr_id = %s",
            [page_id],
        )
        row = cursor.fetchone()

    if row is None:
        return

    content = json.loads(row[0])
    updated = False

    for block in content:
        value = block.get("value", {})
        heading = value.get("heading", "")
        if slugify(heading) == SECTION_6_SLUG:
            detail = value.get("detail", "")
            if TRADEMARK_ATTRIBUTION_TEXT in detail:
                value["detail"] = detail.replace(TRADEMARK_ATTRIBUTION_TEXT, "")
                updated = True
            break

    if updated:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE cms_resourcepage SET content = %s WHERE page_ptr_id = %s",
                [json.dumps(content), page_id],
            )


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0053_privacy_page_wagtail6_fix"),
    ]

    operations = [
        migrations.RunPython(
            add_trademark_attribution,
            reverse_code=remove_trademark_attribution,
        )
    ]
