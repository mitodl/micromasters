"""
Template tags for financial aid review page
"""
from django import template


register = template.Library()


def get_attribute(input_dict, key):  # pylint: disable=missing-docstring
    return input_dict.get(key, None)

register.filter("get_attribute", get_attribute)
