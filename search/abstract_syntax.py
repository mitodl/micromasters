"""Functions for parsing and rendering Elasticsearch queries"""
import logging

from micromasters.utils import walk_hierarchy
from search.api import adjust_search_for_percolator


log = logging.getLogger(__name__)


TRANSLATE_KEYS = {
    'program.enrollments.course_title': 'course_title',
    'program.enrollments.payment_status': 'payment_status',
    'program.enrollments.semester': 'semester',
    'profile.birth_country': 'birth_country',
    'profile.country': 'country',
    'profile.state_or_territory': 'state_or_territory',
    'profile.education.degree_name': 'degree_name',
    'profile.work_history.company_name': 'company_name',
    'program.id': 'program_id',
    'program.enrollments.final_grade': 'final_grade',
}
REVERSE_TRANSLATE_KEYS = {v:k for k, v in TRANSLATE_KEYS.items()}


def lookup_translate_key(key):
    try:
        return TRANSLATE_KEYS[key]
    except KeyError:
        raise ParseException('Unable to find key {} in translation table'.format(key))


class ParseException(Exception):
    """Exception raised when failing to parse a search query"""


def get_key_value(value):
    if not isinstance(value, dict) or len(value) != 1:
        raise ParseException('Expected {} to be a dict with one key value pair'.format(value))
    return next(iter(value.items()))


def parse_term(dictionary):
    key, value = get_key_value(dictionary)
    translated_key = lookup_translate_key(key)
    return {
        'key': translated_key,
        'value': value,
        'type': 'term',
    }


def parse_range(dictionary):
    key, value = get_key_value(dictionary)
    translated_key = lookup_translate_key(key)
    return {
        'key': translated_key,
        'value': value,
        'type': 'range',
    }


def parse_match(dictionary):
    try:
        return {
            'key': 'text',
            'type': 'match',
            'value': dictionary['query']
        }
    except KeyError:
        raise ParseException('Unable to find query string in {}'.format(dictionary))


def parse(search):
    """
    Parse an Elasticsearch query into the abstract syntax
    
    Args:
        search (Search): An elasticsearch search
    """
    filters = []

    # This removes aggregations and moves the post_filter filters in with the search text in 'query'
    search = adjust_search_for_percolator(search)
    for value, stack in walk_hierarchy(search.to_dict()):
        try:
            if len(stack) > 0:
                if stack[-1] == 'term':
                    filters.append(parse_term(value))
                elif stack[-1] == 'range':
                    filters.append(parse_range(value))
                elif stack[-1] == 'multi_match':
                    filters.append(parse_match(value))
        except ParseException:
            log.exception('Unexpected filter encountered, skipping...')

    return filters


class RenderException(Exception):
    """Exception when rendering abstract syntax to Elasticsearch query"""


def render_filter(_filter):
    try:
        translated_key = REVERSE_TRANSLATE_KEYS[_filter['key']]
    except KeyError:
        raise RenderException("Unable to look up key for filter {}".format(_filter))

    if _filter['type'] == 'term':
        return {'term': {translated_key: _filter['value']}}
    elif _filter['type'] == 'range':
        return {'range': {translated_key: _filter['value']}}
    elif _filter['type'] == 'match':
        return {
            "multi_match": {
                "type": "phrase_prefix",
                "query": _filter['value'],
                "analyzer": "folding",
                "fields": [
                    "profile.first_name.folded",
                    "profile.last_name.folded",
                    "profile.preferred_name.folded",
                    "profile.username.folded",
                    "profile.full_name.folded",
                    "email.folded"
                ]
            }
        }
    else:
        raise RenderException("Unexpected filter {}".format(_filter))


def render(filters):
    """
    Render abstract syntax into an Elasticsearch query
    """
    filters_map = {_filter['key']: _filter for _filter in filters}


    query_filters = []
    enrollment_filters = []

    for _filter in filters:
        if _filter['key'] in ('course_title', 'final_grade', 'payment_status', 'semester'):
            enrollment_filters.append(render_filter(_filter))
        elif _filter['key'] == 'degree_name':
            query_filters.append({
                'nested': {
                    'path': 'profile.education',
                    'filter': render_filter(_filter)
                }
            })
        elif _filter['key'] == 'company_name':
            query_filters.append({
                'nested': {
                    'path': 'profile.work_history',
                    'filter': render_filter(_filter)
                }
            })
        elif _filter['key'] != 'text':
            query_filters.append(render_filter(_filter))

    if len(enrollment_filters) > 0:
        query_filters.insert(0, {
            'nested': {
                'path': 'program.enrollments',
                'filter': {
                    'bool': {
                        'must': enrollment_filters
                    }
                }
            }
        })

    query = {
        'query': {
            'bool': {
                'filter': [
                    {
                        'bool': {
                            'must': query_filters
                        }
                    }
                ]
            }
        }
    }

    text = filters_map.get('text', {}).get('value')
    if text is not None:
        query['query']['bool']['must'] = [
            {
                "multi_match": {
                    "type": "phrase_prefix",
                    "query": text,
                    "analyzer": "folding",
                    "fields": [
                        "profile.first_name.folded",
                        "profile.last_name.folded",
                        "profile.preferred_name.folded",
                        "profile.username.folded",
                        "profile.full_name.folded",
                        "email.folded"
                    ]
                }
            }
        ]
    return query
