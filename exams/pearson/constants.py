"""Pearson-related constants"""

# Pearson TSV constants
PEARSON_DATE_FORMAT = "%Y/%m/%d"
PEARSON_DATETIME_FORMAT = "%Y/%m/%d %H:%M:%S"

PEARSON_FILE_TYPE_EAC = 'eac'
PEARSON_FILE_TYPE_VCDC = 'vcdc'

# SFTP Upload constants
PEARSON_UPLOAD_REQUIRED_SETTINGS = [
    "EXAMS_SFTP_HOST",
    "EXAMS_SFTP_PORT",
    "EXAMS_SFTP_USERNAME",
    "EXAMS_SFTP_PASSWORD",
    "EXAMS_SFTP_UPLOAD_DIR",
]

# Common options for Pearson TSV readers/writers
PEARSON_DIALECT_OPTIONS = {
    'delimiter': '\t',
}

# Exam Authorization Confirmation files (EAC) file statuses.
EAC_SUCCESS_STATUS = "Accepted"
EAC_FAILURE_STATUS = "Error"
