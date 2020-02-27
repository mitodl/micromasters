"""
Library functions for interacting with test data
"""
import re
from datetime import timedelta

from django.db import transaction
from django.db.utils import IntegrityError
from django.contrib.auth.models import User

from courses.models import Program, Course, CourseRun
from dashboard.api_edx_cache import CachedEdxDataApi
from dashboard.models import CachedCertificate, CachedEnrollment, CachedCurrentGrade, UserCacheRefreshTime
from grades.models import FinalGrade, FinalGradeStatus
from ecommerce.models import Line, Order
from micromasters.utils import (
    remove_falsey_values,
    now_in_utc,
)
from seed_data.management.commands import (
    DEFAULT_GRADE,
    FAKE_PROGRAM_DESC_PREFIX,
    PASSING_GRADE,
    DEFAULT_PRICE,
)
from seed_data.utils import (
    create_active_date_range,
    create_future_date_range,
    create_past_date_range,
    future_date,
    accepts_or_calculates_now,
)


def fake_programs_query():
    """Returns a queryset for programs that were added by the seed_db command"""
    return Program.objects.filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX)


class ModelFinder:
    """Finds a single model object that matches some given parameters or throws and error"""
    model_cls = None
    param_keys = {}

    @classmethod
    def result(cls, objects, params):
        """
        Processes the results from a query; returns a single model object or throws a
        relevant error if more or less than one record was found
        """
        if not params:
            raise Exception(
                "No parameters given for {} records. Accepted parameters: [{}]".format(
                    cls.model_cls.__name__,
                    cls.param_keys
                )
            )
        elif len(objects) == 0:
            raise Exception(
                "No {} found with the given params ({})".format(
                    cls.model_cls.__name__,
                    params
                )
            )
        elif len(objects) > 1:
            exc_text = (
                "Multiple {} records found with the given params ({}). These parameters need to "
                "be specific enough to match a single record.\n{}"
            )
            raise Exception(
                exc_text.format(
                    cls.model_cls.__name__,
                    params,
                    '\n'.join(str(obj) for obj in objects)
                )
            )
        else:
            return objects[0]

    @classmethod
    def calculate_params(cls, **kwargs):
        """Takes a set of keyword args and creates query parameters from them"""
        raise NotImplementedError

    @classmethod
    def find(cls, **kwargs):
        """
        Takes some keyword arguments that will be translated into query parameters, and
        returns the result (or an error)
        """
        params = cls.calculate_params(**kwargs)
        matching_objects = cls.model_cls.objects.filter(**params).all()
        return cls.result(matching_objects, params)


class UserFinder(ModelFinder):
    """Finds a single User"""
    model_cls = User
    param_keys = {'username', 'email'}

    @classmethod
    def calculate_params(cls, **kwargs):
        params = {}
        if 'username' in kwargs:
            params['username__contains'] = kwargs['username']
        if 'email' in kwargs:
            params['email__contains'] = kwargs['email']
        return params


class CourseFinder(ModelFinder):
    """Finds a single Course"""
    model_cls = Course
    param_keys = {'program_title', 'course_level', 'course_title'}

    @classmethod
    def calculate_params(cls, **kwargs):
        params = {}
        if 'program_title' in kwargs:
            params['program__title__contains'] = kwargs['program_title']
        if 'course_level' in kwargs:
            params['title__endswith'] = kwargs['course_level']
        if 'course_title' in kwargs:
            params['title__contains'] = kwargs['course_title']
        return params


class CourseRunFinder(ModelFinder):
    """Finds a single CourseRun"""
    model_cls = CourseRun
    param_keys = {'course_run_title', 'course_run_key'}

    @classmethod
    def calculate_params(cls, **kwargs):
        params = {}
        if 'course_run_title' in kwargs:
            params['title__contains'] = kwargs['course_run_title']
        if 'course_run_key' in kwargs:
            params['edx_course_key__contains'] = kwargs['course_run_key']
        return params


class CachedHandler:
    """Provides common functionality to retrieve/manipulate cached edX model objects"""
    model_cls = None
    cache_type = None

    def __init__(self, user, social_username=None):
        self.user = user
        self.social_username = social_username

    @property
    def username(self):
        """Username to use when setting edX data"""
        return self.social_username or self.user.username

    def clear_all(self, course=None, course_run=None):
        """Clears all cached edX objects associated with a User (and Course/CourseRun, if provided)"""
        params = {'user': self.user}
        if course:
            params['course_run__course'] = course
        if course_run:
            params['course_run'] = course_run
        return self.model_cls.objects.filter(**params).delete()

    @classmethod
    def set_edx_key(cls, obj, course_run):
        """Sets the edX course id, wherever it exists in the cached object data property"""
        raise NotImplementedError

    def build_data_property(self, course_run, **kwargs):
        """Builds the value of the data property for a cached edX object"""
        raise NotImplementedError

    def set_or_create(self, course_run, **kwargs):
        """Ensures that a cached edX object exists, then properly sets values on the data property"""
        data = self.build_data_property(course_run, **kwargs)
        obj, created = self.get_or_create(course_run, data=data)
        if not created:
            obj.data = data
            obj.save()
        CachedEdxDataApi.update_cache_last_access(self.user, self.cache_type, timestamp=now_in_utc())
        return obj

    def find(self, course_run):
        """Gets a cached edX object for a given User and CourseRun"""
        return self.model_cls.objects.filter(user=self.user, course_run=course_run).first()

    def get_or_create(self, course_run, data=None):
        """Gets or creates a cached edX object for a given User and CourseRun"""
        defaults = dict(data=data)
        return self.model_cls.objects.get_or_create(user=self.user, course_run=course_run, defaults=defaults)

    def exists(self, course_run):
        """Returns True if a User has an associated cached edX record for the given CourseRun"""
        return self.model_cls.objects.filter(user=self.user, course_run=course_run).exists()


def _isoformat(date):
    """Format a date or return None if no date exists"""
    return date.isoformat() if date else None


class CachedEnrollmentHandler(CachedHandler):
    """Provides functionality to CachedEnrollment objects"""
    model_cls = CachedEnrollment
    cache_type = 'enrollment'

    @classmethod
    def set_edx_key(cls, obj, course_run):
        obj.data['course_details']['course_id'] = course_run.edx_course_key

    def build_data_property(self, course_run, verified=True, **kwargs):  # pylint: disable=arguments-differ
        return {
            'user': self.username,
            'mode': 'verified' if verified else 'not verified',
            'is_active': True,
            'course_details': {
                'course_id': course_run.edx_course_key,
                'enrollment_start': _isoformat(course_run.enrollment_start),
                'enrollment_end': _isoformat(course_run.enrollment_end)
            }
        }


class CachedCertificateHandler(CachedHandler):
    """Provides functionality to CachedCertificate objects"""
    model_cls = CachedCertificate
    cache_type = 'certificate'

    @classmethod
    def set_edx_key(cls, obj, course_run):
        obj.data['course_id'] = course_run.edx_course_key

    def build_data_property(self, course_run, grade=DEFAULT_GRADE, **kwargs):  # pylint: disable=arguments-differ
        return {
            'username': self.username,
            'course_id': course_run.edx_course_key,
            'certificate_type': 'verified',
            'grade': str(grade)
        }


class CachedCurrentGradeHandler(CachedHandler):
    """Provides functionality to CachedCurrentGrade objects"""
    model_cls = CachedCurrentGrade
    cache_type = 'current_grade'

    @classmethod
    def set_edx_key(cls, obj, course_run):
        obj.data['course_key'] = course_run.edx_course_key

    def build_data_property(self, course_run, grade=DEFAULT_GRADE, **kwargs):  # pylint: disable=arguments-differ
        return {
            'course_key': course_run.edx_course_key,
            'username': self.username,
            'percent': str(grade),
            'passed': grade >= PASSING_GRADE
        }


CACHED_HANDLERS = {
    CachedEnrollment: CachedEnrollmentHandler,
    CachedCertificate: CachedCertificateHandler,
    CachedCurrentGrade: CachedCurrentGradeHandler
}


def ensure_cached_data_freshness(user):
    """
    Ensure that all cached edX data will be considered 'fresh' for a User
    """
    future = future_date()
    updated_values = {cache: future for cache in CachedEdxDataApi.SUPPORTED_CACHES}
    updated_values['user'] = user
    UserCacheRefreshTime.objects.update_or_create(user=user, defaults=updated_values)


def clear_dashboard_data(user, course=None, course_run=None, models=None):
    """
    Clears all of a User's final grade data and all cached edX data for a Course/CourseRun
    (or just the cached data for specific models)
    """
    # Delete all cached edX data for the associated edX models (or all of them if no model is specified)
    if models:
        handlers = [CACHED_HANDLERS[model] for model in models]
    else:
        handlers = CACHED_HANDLERS.values()
    for cached_model_handler in handlers:
        cached_model_handler(user).clear_all(course=course, course_run=course_run)
    # Delete FinalGrade records
    final_grade_params = dict(user=user)
    if course:
        final_grade_params['course_run__course'] = course
    if course_run:
        final_grade_params['course_run'] = course_run
    FinalGrade.objects.filter(**final_grade_params).delete()
    # Delete course payment records (if the associated program is FA-enabled)
    clear_course_payment_data(user, course=course, course_run=course_run)


def generate_enrollment_date_range(course_start_date, day_spread=10):
    """Given a course start date, return an enrollment date range"""
    day_incr = int(day_spread/2)
    return course_start_date - timedelta(days=day_incr), course_start_date + timedelta(days=day_incr)


@accepts_or_calculates_now
def set_course_run_past(course_run, end_date=None, upgradeable=False, save=True, now=None):
    """Sets relevant CourseRun dates to the past relative to now"""
    day_spread = 30
    if end_date:
        course_run.end_date = end_date
        course_run.start_date = end_date - timedelta(days=day_spread)
    else:
        course_run.start_date, course_run.end_date = create_past_date_range(ended_days_ago=30, day_spread=day_spread)
    course_run.enrollment_start, course_run.enrollment_end = generate_enrollment_date_range(course_run.start_date)
    if upgradeable:
        course_run.upgrade_deadline = now + timedelta(days=15)
    else:
        course_run.upgrade_deadline = course_run.enrollment_end
    if save:
        course_run.save()
    return course_run


@accepts_or_calculates_now
def set_course_run_current(course_run, enrollable_now=True,  # pylint: disable=too-many-arguments
                           enrollable_past=False, upgradeable=True, save=True, now=None):
    """Sets relevant CourseRun dates to be current relative to now"""
    if enrollable_now:
        course_run.enrollment_start, course_run.enrollment_end = \
            create_active_date_range(started_days_ago=10, days_until_end=5)
    elif enrollable_past:
        course_run.enrollment_start, course_run.enrollment_end = \
            create_past_date_range(ended_days_ago=2, day_spread=10)
    else:
        course_run.enrollment_start, course_run.enrollment_end = create_future_date_range()
    course_run.start_date = course_run.enrollment_start + timedelta(days=5)
    course_run.end_date = course_run.start_date + timedelta(days=30)
    if enrollable_now and not upgradeable:
        course_run.upgrade_deadline = now - timedelta(days=1)
    else:
        course_run.upgrade_deadline = course_run.enrollment_end + timedelta(days=5)
    if save:
        course_run.save()
    return course_run


def set_course_run_future(course_run, enrollable_now=False, enrollable_past=False, save=True):
    """Sets relevant CourseRun dates to the future relative to now"""
    course_run.start_date, course_run.end_date = create_future_date_range(days_ahead=20, day_spread=30)
    if enrollable_now:
        course_run.enrollment_start, course_run.enrollment_end = create_active_date_range(day_spread=10)
    elif enrollable_past:
        course_run.enrollment_start, course_run.enrollment_end = create_past_date_range()
    else:
        course_run.enrollment_start, course_run.enrollment_end = create_future_date_range(days_ahead=15, day_spread=10)
    course_run.upgrade_deadline = course_run.start_date + timedelta(days=5)
    if save:
        course_run.save()
    return course_run


@accepts_or_calculates_now
def set_course_run_to_past_graded(user, course_run, grade, upgradeable=False, now=None):
    """Ensures that a CourseRun is in the past and has an associated final grade for a given User"""
    if not course_run.is_past:
        set_course_run_past(course_run, upgradeable=upgradeable, save=True)
    elif upgradeable and not course_run.is_upgradable:
        course_run.upgrade_deadline = now + timedelta(days=15)
        course_run.save()
    elif not upgradeable and course_run.is_upgradable:
        course_run.upgrade_deadline = course_run.enrollment_end
        course_run.save()
    # Create enrollment if it doesn't exist
    CachedEnrollmentHandler(user).set_or_create(course_run)
    # Create final grade
    final_grade_defaults = dict(
        grade=grade,
        passed=grade >= PASSING_GRADE,
        status=FinalGradeStatus.COMPLETE
    )
    FinalGrade.objects.update_or_create(
        user=user,
        course_run=course_run,
        defaults=final_grade_defaults
    )
    return course_run


def clear_course_payment_data(user, course=None, course_run=None):
    """
    Clears all course payment data (Order/Line) for a given User and an associated Course or CourseRun.
    This will be a no-op with any Course/CourseRun that is not part of an FA-enabled program.
    """
    program = None
    course_run_params = {}
    final_grade_params = {}
    if course:
        program = course.program
        course_run_params['course'] = course
        final_grade_params['course_run__course'] = course
    elif course_run:
        program = course_run.course.program
        course_run_params['id'] = course_run.id
        final_grade_params['course_run'] = course_run
    if program.financial_aid_availability:
        course_keys = CourseRun.objects.filter(**course_run_params).values_list("edx_course_key", flat=True)
        Order.objects.filter(
            user=user,
            line__course_key__in=remove_falsey_values(course_keys)
        ).delete()
    else:
        if course_run:
            CachedEnrollmentHandler(user).set_or_create(course_run, verified=False)
        FinalGrade.objects.filter(user=user, **final_grade_params).update(course_run_paid_on_edx=False)


def add_paid_order_for_course(user, course_run, price=None):
    """
    Adds an Order and Line for a FA-enabled CourseRun and a User
    """
    course_price_value = price or course_run.course.program.price
    order = Order.objects.create(user=user, status=Order.FULFILLED, total_price_paid=course_price_value)
    Line.objects.create(order=order, course_key=course_run.edx_course_key, price=course_price_value)


def set_course_run_to_paid(user, course_run):
    """Ensures that a User will be considered as having paid for a CourseRun"""
    if course_run.course.program.financial_aid_availability:
        with transaction.atomic():
            is_already_paid = Line.objects.filter(
                course_key=course_run.edx_course_key, order__user=user, order__status=Order.FULFILLED
            ).exists()
            if not is_already_paid:
                add_paid_order_for_course(user, course_run, price=DEFAULT_PRICE)
    else:
        CachedEnrollmentHandler(user).set_or_create(course_run, verified=True)
        FinalGrade.objects.filter(user=user, course_run=course_run).update(course_run_paid_on_edx=True)
    return course_run


def set_course_run_payment_status(user, course_run, paid):
    """Sets a CourseRun to be considered paid or unpaid for the given User"""
    if paid:
        set_course_run_to_paid(user, course_run)
    else:
        clear_course_payment_data(user, course_run=course_run)


def update_fake_course_run_edx_key(user, course_run):
    """
    Convenience method to update a cached edX model based on the data from a CourseRun that was added
    by the seed_db command
    """
    start_date = course_run.start_date
    year = start_date.strftime('%Y')
    month = start_date.strftime('%B')
    short_month = month[:3]
    course_run.edx_course_key = re.sub(r'\w{3}_\d{4}$', '{}_{}'.format(short_month, year), course_run.edx_course_key)
    course_run.title = re.sub(r'\w+ \d{4}$', '{} {}'.format(month, year), course_run.title)
    try:
        course_run.save()
    except IntegrityError:
        # If another course run already has this edx key, just tack on the pk to the end
        course_run.edx_course_key = '{}({})'.format(course_run.edx_course_key, course_run.pk)
        course_run.title = '{} ({})'.format(course_run.title, course_run.pk)
        course_run.save()
    update_cached_edx_data_for_run(user, course_run)
    return course_run


def update_cached_edx_data_for_run(user, course_run):
    """
    Convenience method to update the course id in a User's cached edX records
    based on a CourseRun.edx_course_key value
    """
    for cached_handler_cls in CACHED_HANDLERS.values():
        cached_handler = cached_handler_cls(user)
        cached_obj = cached_handler.find(course_run)
        if cached_obj:
            cached_handler.set_edx_key(cached_obj, course_run)
            cached_obj.save()


def is_fake_program_course_run(course_run):
    """
    Checks if a given CourseRun was added by the seed_db command
    """
    return course_run.course.program in fake_programs_query()
