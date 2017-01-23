"""
Utils for URLs (to avoid circular imports)
"""

DASHBOARD_URL = '/dashboard/'
PROFILE_URL = '/profile/'
PROFILE_PERSONAL_URL = '{}personal/?'.format(PROFILE_URL)
PROFILE_EDUCATION_URL = '{}education/?'.format(PROFILE_URL)
PROFILE_EMPLOYMENT_URL = '{}professional/?'.format(PROFILE_URL)
TERMS_OF_SERVICE_URL = '/terms_of_service/'
SETTINGS_URL = "/settings/"
SEARCH_URL = "/learners/"
ORDER_SUMMARY = "/order_summary/"

DASHBOARD_URLS = [
    DASHBOARD_URL,
    PROFILE_URL,
    PROFILE_PERSONAL_URL,
    PROFILE_EDUCATION_URL,
    PROFILE_EMPLOYMENT_URL,
    SETTINGS_URL,
    SEARCH_URL,
    ORDER_SUMMARY,
]
