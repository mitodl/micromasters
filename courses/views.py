"""Views for courses"""
from django.db import transaction
from rest_framework import (
    viewsets,
    mixins,
    status,
)
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.exceptions import (
    APIException,
    NotFound,
    ValidationError,
)
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from courses.catalog_serializers import CatalogProgramSerializer
from courses.models import Program, CourseRun
from courses.serializers import ProgramSerializer, CourseRunSerializer
from dashboard.models import ProgramEnrollment
from profiles.models import Profile
from profiles.serializers import ProfileImageSerializer


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


class ProgramLearnersView(APIView):
    """API for Learners enrolled in the Program"""

    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (
        IsAuthenticated,
    )
    serializer_class = ProfileImageSerializer

    def get(self, request, *args, **kargs):
        """
        Get eight random learners with images and
        the total count of visible learners in the program
        """
        program_id = self.kwargs["program_id"]
        users = ProgramEnrollment.objects.filter(
            program_id=program_id
        ).values_list('user', flat=True)

        queryset = Profile.objects.exclude(
            image_small__exact=''
        ).filter(user__in=users).exclude(
            account_privacy='private'
        ).exclude(
            user=request.user
        ).order_by('?')

        learners_result = {
            'learners_count': queryset.count(),
            'learners': ProfileImageSerializer(queryset[:8], many=True).data
        }
        return Response(
            status=status.HTTP_200_OK,
            data=learners_result
        )


class ProgramEnrollmentListView(CreateAPIView):
    """API for the User Program Enrollments"""

    serializer_class = ProgramSerializer
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (
        IsAuthenticated,
    )

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
            data=serializer(program, context={'request': request}).data
        )


class CourseRunViewSet(viewsets.ReadOnlyModelViewSet):
    """API for the CourseRun model"""
    serializer_class = CourseRunSerializer
    queryset = CourseRun.objects.all()


class CatalogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """API for program/course catalog list"""
    serializer_class = CatalogProgramSerializer
    queryset = Program.objects.filter(live=True).prefetch_related(
        "course_set__courserun_set", "programpage__thumbnail_image"
    )
