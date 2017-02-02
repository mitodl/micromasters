"""
Utility functions for CMS models
"""
from urllib.parse import urlparse, parse_qs


def get_coupon_code(request):
    """
    Get coupon code from an HttpRequest

    Args:
        request (django.http.request.HttpRequest): An HttpRequest

    Returns:
        str: A coupon code or None if none found
    """
    next_url = request.GET.get("next")
    if not next_url:
        return None
    parsed = urlparse(next_url)
    path = parsed.path
    if path not in ("/dashboard", "/dashboard/"):
        return None
    coupons = parse_qs(parsed.query).get("coupon")
    if coupons:
        return coupons[0]
    return None
