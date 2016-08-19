"""
Tests for ecommerce models
"""

from django.test import TestCase

from ecommerce.exceptions import EcommerceModelException
from ecommerce.factories import CoursePriceFactory


class CoursePriceTests(TestCase):
    """
    Tests for CoursePrice
    """

    def test_create_no_two_is_valid(self):
        """
        Two is_valid CoursePrice instances on the same model are not valid
        """
        price = CoursePriceFactory.create(is_valid=True)
        with self.assertRaises(EcommerceModelException) as ex:
            CoursePriceFactory.create(is_valid=True, course_run=price.course_run)

        assert ex.exception.args[0] == "Cannot have two CoursePrice objects for same CourseRun marked is_valid"

    def test_update_no_two_is_valid(self):
        """
        A CoursePrice instance shouldn't be able to be updated to have two is_valid instances for a CourseRun
        """
        price = CoursePriceFactory.create(is_valid=False)
        CoursePriceFactory.create(is_valid=True, course_run=price.course_run)
        with self.assertRaises(EcommerceModelException) as ex:
            price.is_valid = True
            price.save()

        assert ex.exception.args[0] == "Cannot have two CoursePrice objects for same CourseRun marked is_valid"

    def test_update_one_is_valid(self):  # pylint: disable=no-self-use
        """
        If only one CoursePrice has is_valid=True, we should be able to update it without problems
        """
        price = CoursePriceFactory.create(is_valid=True)
        price.price = 345
        price.save()

    def test_two_different_courseruns(self):  # pylint: disable=no-self-use
        """
        Two CoursePrices can have is_valid=True for two different CourseRuns
        """
        CoursePriceFactory.create(is_valid=True)
        CoursePriceFactory.create(is_valid=True)
