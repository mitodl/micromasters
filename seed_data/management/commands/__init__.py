from datetime import datetime, timedelta

USER_DATA_PATH = 'seed_data/management/users.json'
PROGRAM_DATA_PATH = 'seed_data/management/programs.json'
FAKE_USER_USERNAME_PREFIX = 'fake.'
FAKE_PROGRAM_DESC_PREFIX = '[FAKE] '
CACHED_MODEL_LAST_REQUEST = datetime.now() + timedelta(days=365)
