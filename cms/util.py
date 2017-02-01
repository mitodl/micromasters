"""
Utility functions for CMS models
"""
from urllib.parse import urlparse, parse_qs


def get_coupon_code(request):
    coupon_code = request.GET.get("coupon", None)
    if coupon_code:
        return coupon_code
    next_url = request.GET.get("next", None)
    if not next_url:
        return None
    parsed = urlparse(next_url)
    coupons = parse_qs(parsed.query).get("coupon", None)
    if coupons:
        return coupons[0]
    return None
