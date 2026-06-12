"""
Globals for commands relating to seeding data into the database
"""
from decimal import Decimal

USER_DATA_PATH = "seed_data/management/users.json"
PROGRAM_DATA_PATH = "seed_data/management/programs.json"
FAKE_USER_USERNAME_PREFIX = "fake."
FAKE_PROGRAM_DESC_PREFIX = "[FAKE] "

DEFAULT_GRADE = Decimal("0.75")
DEFAULT_FAILED_GRADE = Decimal("0.50")
DEFAULT_COURSE_PRICE = Decimal("123.45")
PASSING_GRADE = Decimal("0.60")
DEFAULT_PRICE = 101
