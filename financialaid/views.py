"""
Views for financialaid
"""
import json
from functools import reduce

from django.conf import settings
from django.contrib.auth.mixins import UserPassesTestMixin
from django.contrib.auth.models import User
from django.db.models import F, Q
from django.views.generic import ListView
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    CreateAPIView,
    get_object_or_404,
    UpdateAPIView
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK
from rest_framework.views import APIView
from rolepermissions.checkers import (
    has_object_permission,
    has_role,
)

from courses.models import Program
from dashboard.models import ProgramEnrollment
from dashboard.permissions import CanReadIfStaffOrSelf
from financialaid.api import (
    get_formatted_course_price,
    get_no_discount_tier_program,
)
from financialaid.constants import (
    FinancialAidJustification,
    FinancialAidStatus
)
from financialaid.models import (
    FinancialAid,
    TierProgram
)
from financialaid.permissions import (
    UserCanEditFinancialAid,
    FinancialAidUserMatchesLoggedInUser
)
from financialaid.serializers import (
    FinancialAidActionSerializer,
    FinancialAidRequestSerializer,
    FinancialAidSerializer,
    FormattedCoursePriceSerializer,
)
from mail.serializers import GenericMailSerializer
from micromasters.utils import now_in_utc
from roles.models import (
    Instructor,
    Staff,
)
from roles.roles import Permissions
from backends.edxorg import EdxOrgOAuth2


class FinancialAidRequestView(CreateAPIView):
    """
    View for financial aid request API. Takes income, currency, and program, then determines whether review
    is necessary, and if not, sets the appropriate tier for personalized pricing.
    """
    serializer_class = FinancialAidRequestSerializer
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated, )

    def get_queryset(self):  # pragma: no cover
        """
        Allows the DRF helper pages to load - not available in production
        """
        return None


class FinancialAidSkipView(UpdateAPIView):
    """
    View for financial aid skip API. Takes user and program, then determines whether a financial
    aid object exists, and then either creates or updates a financial aid object to reflect
    the user skipping financial aid.
    """
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated, )

    def update(self, request, *args, **kwargs):
        """
        Overrides get_object in case financialaid object does not exist, as the learner may skip
        financial aid either after starting the process or in lieu of applying
        """
        user = request.user
        program = get_object_or_404(Program, id=self.kwargs["program_id"])
        if not program.financial_aid_availability:
            raise ValidationError("Financial aid not available for this program.")
        if not ProgramEnrollment.objects.filter(program=program.id, user=user).exists():
            raise ValidationError("User not in program.")

        financialaid = FinancialAid.objects.filter(
            user=user,
            tier_program__program=program,
        ).exclude(status=FinancialAidStatus.RESET).first()
        if financialaid is None:
            financialaid = FinancialAid(
                user=user,
                country_of_income=user.profile.country,
                date_exchange_rate=now_in_utc(),
                country_of_residence=user.profile.country,
            )

        if financialaid.status in FinancialAidStatus.TERMINAL_STATUSES:
            raise ValidationError("Financial aid application cannot be skipped once it's been approved or skipped.")

        financialaid.tier_program = get_no_discount_tier_program(program.id)
        financialaid.status = FinancialAidStatus.SKIPPED
        financialaid.save_and_log(user)
        return Response(status=HTTP_200_OK)


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
    search_query = None
    selected_status = None
    program = None
    course_price = None
    default_status = FinancialAidStatus.PENDING_MANUAL_APPROVAL
    # Used for sorting
    sort_field = None
    sort_direction = ""
    sort_fields = {
        "adjusted_cost": {
            "display": "Adjusted Cost"
        },
        "date_calculated": {
            "display": "Date Calculated"
        },
        "last_name": {
            "display": "Name/Location"
        },
        "reported_income": {
            "display": "Income/Yr."
        },
        "date_documents_sent": {
            "display": "Date Docs Sent"
        }
    }
    sort_field_mappings = {
        "date_calculated": "created_on",
        "last_name": "user__profile__last_name",
        "reported_income": "income_usd",
    }
    default_sort_field = "last_name"

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

    def get_context_data(self, **kwargs):  # pylint: disable=arguments-differ
        """
        Gets context for view
        """
        context = super().get_context_data(**kwargs)

        # Constants required in view
        context["selected_status"] = self.selected_status
        context["statuses"] = FinancialAidStatus
        context["justifications"] = FinancialAidJustification.ALL_JUSTIFICATIONS
        context["email_serializer"] = GenericMailSerializer()
        context["current_sort_field"] = "{sort_direction}{sort_field}".format(
            sort_direction=self.sort_direction,
            sort_field=self.sort_field
        )
        context["current_program_id"] = self.program.id
        context["tier_programs"] = TierProgram.objects.filter(
            program_id=context["current_program_id"],
            current=True
        ).order_by(
            "discount_amount"
        ).annotate(
            adjusted_cost=self.course_price - F("discount_amount")
        )
        context["search_query"] = self.search_query

        # Create ordered list of (financial aid status, financial message)
        message_order = (
            FinancialAidStatus.AUTO_APPROVED,
            FinancialAidStatus.PENDING_DOCS,
            FinancialAidStatus.DOCS_SENT,
            FinancialAidStatus.PENDING_MANUAL_APPROVAL,
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.SKIPPED,
        )
        context["financial_aid_statuses"] = (
            (status, FinancialAidStatus.STATUS_MESSAGES_DICT[status])
            for status in message_order
        )

        # Get sort field information
        new_sort_direction = "" if self.sort_direction == "-" else "-"
        for field, field_dict in self.sort_fields.items():
            # For appending the sort_by get param on url
            field_dict["sort_field"] = "{sort_direction}{sort_field}".format(
                # If this field is our current sort field, we want to toggle the sort direction, else default ""
                sort_direction=new_sort_direction if field == self.sort_field else "",
                sort_field=field
            )
            # If this field is the current sort field, we want to indicate the current sort direction
            field_dict["direction_display"] = self.sort_direction if field == self.sort_field else None
        context["sort_fields"] = self.sort_fields

        # Required for styling
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "reactGaDebug": settings.REACT_GA_DEBUG,
            "authenticated": not self.request.user.is_anonymous,
            "edx_base_url": settings.EDXORG_BASE_URL,
        }
        context["js_settings_json"] = json.dumps(js_settings)
        context["authenticated"] = not self.request.user.is_anonymous
        context["is_public"] = False
        context["has_zendesk_widget"] = True
        context["is_staff"] = has_role(self.request.user, [Staff.ROLE_ID, Instructor.ROLE_ID])
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
            self.selected_status = self.default_status
        financial_aids = financial_aids.filter(status=self.selected_status)

        # Filter by search query
        self.search_query = self.request.GET.get("search_query", "")
        search_query = reduce(
            lambda q, term: (
                q |
                Q(user__profile__first_name__icontains=term) |
                Q(user__profile__last_name__icontains=term)
            ),
            self.search_query.split(),
            Q()
        )
        if search_query:
            financial_aids = financial_aids.filter(search_query)

        # Annotate with adjusted cost
        self.course_price = self.program.price
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
    View for modifying financial aid request statuses as a Staff user
    """
    serializer_class = FinancialAidActionSerializer
    permission_classes = (IsAuthenticated, UserCanEditFinancialAid)
    lookup_field = "id"
    lookup_url_kwarg = "financial_aid_id"
    queryset = FinancialAid.objects.all()


class FinancialAidDetailView(UpdateAPIView):
    """
    View for updating a FinancialAid record
    """
    serializer_class = FinancialAidSerializer
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated, FinancialAidUserMatchesLoggedInUser)
    lookup_field = "id"
    lookup_url_kwarg = "financial_aid_id"
    queryset = FinancialAid.objects.all()


class CoursePriceListView(APIView):
    """
    View for retrieving a learner's price for course runs in all enrolled programs
    """
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated, CanReadIfStaffOrSelf)

    def get(self, request, username, *args, **kwargs):
        """
        GET handler
        """
        user = get_object_or_404(
            User,
            social_auth__uid=username,
            social_auth__provider=EdxOrgOAuth2.name
        )

        program_enrollments = (
            ProgramEnrollment.objects
            .select_related('user', 'program')
            .filter(user=user, program__live=True).all()
        )
        formatted_course_prices = [
            get_formatted_course_price(program_enrollment)
            for program_enrollment in program_enrollments
        ]
        serializer = FormattedCoursePriceSerializer(
            formatted_course_prices,
            many=True
        )
        return Response(data=serializer.data)


class CoursePriceDetailView(APIView):
    """
    View for retrieving a learner's price for a course run
    """
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated, )

    def get(self, request, *args, **kwargs):
        """
        GET handler
        """
        user = request.user
        program_enrollment = get_object_or_404(
            ProgramEnrollment,
            user=user,
            program__id=self.kwargs["program_id"],
            program__live=True
        )
        serializer = FormattedCoursePriceSerializer(
            get_formatted_course_price(program_enrollment)
        )
        return Response(data=serializer.data)
