"""
cms views
"""
from django.contrib.auth.views import redirect_to_login
from django.urls import reverse
from cms.factories import ProgramPageFactory, ProgramLetterSignatoryFactory
from django.urls import reverse
from search.base import MockedESTestCase


class WagtailAPITestCase(MockedESTestCase):
    def test_program_page_api_detail(self):
        page = ProgramPageFactory(title="test program page title")
        response = self.client.get(reverse("wagtailapi:pages:detail", args=[page.id]))
        json = response.json()
        self.assertTrue(json["title"] == page.title)

    def test_program_page_api_serializes_signatories(self):
        page = ProgramPageFactory(
            description="test program page description", title="test program page title"
        )
        ProgramLetterSignatoryFactory.create_batch(3, program_page=page)
        response = self.client.get(reverse("wagtailapi:pages:detail", args=[page.id]))
        json = response.json()
        signatories = response.json()["program_letter_signatories"]
        self.assertTrue(len(signatories) == 3)
        self.assertTrue("signature_image" in signatories[0].keys())
        self.assertTrue(
            "download_url" in signatories[0]["signature_image"]["meta"].keys()
        )

    def test_program_page_api_list_view_details(self):
        """
        Tests that we can get all the program letter
        related detail from the list view directly
        """
        page = ProgramPageFactory(
            description="test program page description", title="test program page title"
        )
        ProgramLetterSignatoryFactory.create_batch(3, program_page=page)
        response = self.client.get(
            reverse("wagtailapi:pages:listing"),
            {"id": page.id, "type": "cms.ProgramPage", "fields": "*"},
        )
        json = response.json()
        response_keys = list(json["items"][0].keys())
        self.assertTrue(all([key in response_keys for key in[
                "title",
                "program_id",
                "program_letter_footer",
                "program_letter_footer_text",
                "program_letter_header_text",
                "program_letter_logo",
                "program_letter_text",
                "program_letter_signatories",
            ]]))
        
