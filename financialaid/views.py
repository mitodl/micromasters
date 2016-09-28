"""
Views for financialaid
"""
import json

from django.conf import settings
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models import F
from django.views.generic import ListView
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import (
    CreateAPIView,
    get_object_or_404,
    UpdateAPIView
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rolepermissions.verifications import has_object_permission

from courses.models import Program
from financialaid.api import get_course_price_for_learner
from financialaid.models import (
    FinancialAid,
    FinancialAidStatus,
    TierProgram
)
from financialaid.permissions import UserCanEditFinancialAid
from financialaid.serializers import (
    FinancialAidActionSerializer,
    FinancialAidRequestSerializer
)
from roles.roles import Permissions
from ui.views import get_bundle_url


class FinancialAidRequestView(CreateAPIView):
    """
    View for financial aid request API. Takes income, currency, and program, then determines whether review
    is necessary, and if not, sets the appropriate tier for personalized pricing.
    """
    serializer_class = FinancialAidRequestSerializer
    authentication_classes = (SessionAuthentication, )
    permission_classes = (IsAuthenticated, )

    def get_queryset(self):  # pragma: no cover
        """
        Allows the DRF helper pages to load - not available in production
        """
        return None


class ReviewFinancialAidView(UserPassesTestMixin, ListView):
    """
    View for reviewing financial aid requests.
    Note: In the future, it may be worth factoring out the code for sorting into its own subclass of ListView
    """
    paginate_by = 50
    context_object_name = "financial_aid_objects"
    template_name = "review_financial_aid.html"
    # If user doesn't pass test_func, raises exception instead of redirecting to login url
    raise_exception = True
    # Used to modify queryset and in context
    selected_status = None
    program = None
    course_price = None
    # Used for sorting
    sort_field = None
    sort_direction = ""
    sort_field_info = None
    sort_fields = {
        "first_name": {
            "display": "First Name"
        },
        "last_name": {
            "display": "Last Name"
        },
        "location": {
            "display": "Location"
        },
        "adjusted_cost": {
            "display": "Adjusted Cost"
        },
        "reported_income": {
            "display": "Reported Income"
        },
    }
    sort_field_mappings = {
        "first_name": "user__profile__first_name",
        "last_name": "user__profile__last_name",
        "location": "user__profile__city",
        "reported_income": "income_usd",
    }
    default_sort_field = "first_name"

    def test_func(self):
        """
        Validate user permissions (Analogous to permissions_classes for DRF)
        """
        self.program = get_object_or_404(
            Program,
            id=self.kwargs["program_id"],  # pylint: disable=unsubscriptable-object
            live=True,
            financial_aid_availability=True
        )
        return has_object_permission(Permissions.CAN_EDIT_FINANCIAL_AID, self.request.user, self.program)

    def get_context_data(self, **kwargs):
        """
        Gets context for view
        """
        context = super().get_context_data(**kwargs)

        # Constants required in view
        context["selected_status"] = self.selected_status
        context["current_sort_field"] = "{sort_direction}{sort_field}".format(
            sort_direction=self.sort_direction,
            sort_field=self.sort_field
        )
        context["current_program_id"] = self.program.id
        context["tier_programs"] = TierProgram.objects.filter(
            program_id=context["current_program_id"]
        ).order_by(
            "discount_amount"
        ).annotate(
            adjusted_cost=self.course_price - F("discount_amount")
        )

        # Create ordered list of (financial aid status, financial message)
        messages = FinancialAidStatus.STATUS_MESSAGES_DICT
        message_order = (
            FinancialAidStatus.PENDING_MANUAL_APPROVAL,
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.REJECTED,
            FinancialAidStatus.AUTO_APPROVED
        )
        context["financial_aid_statuses"] = (
            (status, "Show: {message}".format(message=messages[status]))
            for status in message_order
        )

        # Get sort field information
        sort_link_order = (
            "first_name",
            "last_name",
            "location",
            "adjusted_cost",
            "reported_income",
        )
        new_sort_direction = "" if self.sort_direction == "-" else "-"
        context["sort_field_info"] = (
            {
                # For appending the sort_by get param on url
                "sort_field": "{sort_direction}{sort_field}".format(
                    # If this field is our current sort field, we want to toggle the sort direction, else default ""
                    sort_direction=new_sort_direction if field == self.sort_field else "",
                    sort_field=field
                ),
                # If this field is the current sort field, we want to indicate the current sort direction
                "direction_display": self.sort_direction if field == self.sort_field else None,
                "display": self.sort_fields[field]["display"]
            }
            for field in sort_link_order
        )

        # Required for styling
        context["style_src"] = get_bundle_url(self.request, "style.js")
        context["dashboard_src"] = get_bundle_url(self.request, "dashboard.js")
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "reactGaDebug": settings.REACT_GA_DEBUG,
            "authenticated": not self.request.user.is_anonymous(),
            "edx_base_url": settings.EDXORG_BASE_URL,
        }
        context["js_settings_json"] = json.dumps(js_settings)
        return context

    def get_queryset(self):
        """
        Gets queryset for ListView to return to view
        """
        # Filter by program (self.program set in test_func())
        financial_aids = FinancialAid.objects.filter(
            tier_program__program=self.program
        )

        # Filter by status
        self.selected_status = self.kwargs.get("status", None)
        if self.selected_status is None or self.selected_status not in FinancialAidStatus.ALL_STATUSES:
            self.selected_status = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        financial_aids = financial_aids.filter(status=self.selected_status)

        # Annotate with adjusted cost
        self.course_price = self.program.get_course_price()
        financial_aids = financial_aids.annotate(adjusted_cost=self.course_price - F("tier_program__discount_amount"))

        # Sort by field
        self.sort_field = self.request.GET.get("sort_by", self.default_sort_field)
        if self.sort_field.startswith("-"):
            self.sort_field = self.sort_field[1:]
            # Defined above: self.sort_direction = ""
            self.sort_direction = "-"
        if self.sort_field not in self.sort_fields:
            self.sort_field = self.default_sort_field
            self.sort_direction = ""
        financial_aids = financial_aids.order_by(
            "{sort_direction}{sort_field}".format(
                sort_direction=self.sort_direction,
                sort_field=self.sort_field_mappings.get(self.sort_field, self.sort_field)
            )
        )

        return financial_aids


class FinancialAidActionView(UpdateAPIView):
    """
    View for rejecting and approving financial aid requests
    """
    serializer_class = FinancialAidActionSerializer
    permission_classes = (IsAuthenticated, UserCanEditFinancialAid)
    lookup_field = "id"
    lookup_url_kwarg = "financial_aid_id"
    queryset = FinancialAid.objects.all()


class GetLearnerPriceForCourseView(APIView):
    """
    View for retrieving a leaner's price for a course run
    """
    authentication_classes = (SessionAuthentication, )
    permission_classes = (IsAuthenticated, )

    def get(self, request, *args, **kwargs):
        """
        Get request for GetLearnerPriceForCourseView
        """
        learner = request.user
        program = get_object_or_404(
            Program,
            id=self.kwargs["program_id"],
            live=True
        )
        return Response(
            data=get_course_price_for_learner(learner, program)
        )
