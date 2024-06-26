"""backend related constants"""

# courseware backend constants
from micromasters.settings import MITXONLINE_CALLBACK_URL, EDXORG_CALLBACK_URL

BACKEND_EDX_ORG = 'edxorg'
BACKEND_MITX_ONLINE = 'mitxonline'
COURSEWARE_BACKENDS = [
    BACKEND_MITX_ONLINE,
    BACKEND_EDX_ORG,
]
COURSEWARE_BACKEND_URL = {
    BACKEND_MITX_ONLINE: MITXONLINE_CALLBACK_URL,
    BACKEND_EDX_ORG: EDXORG_CALLBACK_URL,
}
