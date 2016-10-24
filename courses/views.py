"""Views for courses"""
from django.db import transaction
from rest_framework import (
    viewsets,
    status,
)
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.exceptions import (
    APIException,
    NotFound,
    ValidationError,
)
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from courses.models import Program
from courses.serializers import ProgramSerializer
from dashboard.models import ProgramEnrollment


class ResourceConflict(APIException):
    """Custom exception for Conflict Status Code"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'The resource already exists.'


class ProgramViewSet(viewsets.ReadOnlyModelViewSet):
    """API for the Program collection"""
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (
        IsAuthenticated,
    )
    queryset = Program.objects.filter(live=True)
    serializer_class = ProgramSerializer


class ProgramEnrollmentListView(ListCreateAPIView):
    """API for the User Program Enrollments"""

    serializer_class = ProgramSerializer
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (
        IsAuthenticated,
    )

    def get_queryset(self):
        """
        Filter programs by the user enrollment
        """
        queryset = Program.objects.filter(programenrollment__user=self.request.user, live=True)
        return queryset.order_by('title')

    @transaction.atomic
    def create(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Create an enrollment for the current user
        """
        program_id = request.data.get('program_id')
        if not isinstance(program_id, int):
            raise ValidationError('A `program_id` parameter must be specified')

        serializer = self.get_serializer_class()

        try:
            program = Program.objects.get(live=True, pk=program_id)
        except Program.DoesNotExist:
            raise NotFound('The specified program has not been found or it is not live yet')

        _, created = ProgramEnrollment.objects.get_or_create(
            user=request.user,
            program=program,
        )
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(
            status=status_code,
            data=serializer(program).data
        )
