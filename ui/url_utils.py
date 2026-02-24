"""
Utils for URLs (to avoid circular imports)
"""

DASHBOARD_URL = '/dashboard/'
PROFILE_URL = '/profile/'
PROFILE_PERSONAL_URL = f'{PROFILE_URL}personal/?'
PROFILE_EDUCATION_URL = f'{PROFILE_URL}education/?'
PROFILE_EMPLOYMENT_URL = f'{PROFILE_URL}professional/?'
SETTINGS_URL = "/settings/"
SEARCH_URL = "/learners/"
EMAIL_URL = "/automaticemails/"

DASHBOARD_URLS = [
    DASHBOARD_URL,
    PROFILE_URL,
    PROFILE_PERSONAL_URL,
    PROFILE_EDUCATION_URL,
    PROFILE_EMPLOYMENT_URL,
    SETTINGS_URL,
    SEARCH_URL,
    EMAIL_URL,
]
