"""
Model tests
"""
from django.test import TestCase

from cms.models import FrequentlyAskedQuestion


class FrequentlyAskedQuestionTests(TestCase):
    """Tests for FrequentlyAskedQuestion model"""

    def test_save(self):
        """
        Test that save method generates unique slugs for
        similar questions
        """
        faq_0 = FrequentlyAskedQuestion.objects.create(
            question="Test Question",
            answer="Test Answer"
        )
        faq_1 = FrequentlyAskedQuestion.objects.create(
            question="Test Question",
            answer="Test Answer"
        )
        assert faq_0.slug == "test-question"
        assert faq_1.slug == "test-question-1"
