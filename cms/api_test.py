"""
Tests for the program page api functions
"""
from datetime import datetime, timedelta
import pytz

from search.base import ESTestCase
from courses.factories import (
    CourseFactory,
    CourseRunFactory,
)
from cms.api import get_course_enrollment_text


# pylint: disable=no-self-use
class CourseEnrollmentInfoTest(ESTestCase):
    """Test for get_course_enrollment_text"""

    def setUp(self):
        super(CourseEnrollmentInfoTest, self).setUp()
        self.now = datetime.now(pytz.utc)

    def test_future_course_enr_future(self):
        """Test Course that starts in the future, enrollment in future"""
        course = CourseFactory.create(title="Course in the future")
        future_date = self.now + timedelta(weeks=1)
        start_date = 'Starts {:%D} - '.format(future_date)
        enr_start = 'Enrollment {:%m/%Y}'.format(future_date)
        # create a run that starts soon, enrollment_start in the future
        CourseRunFactory.create(
            course=course,
            start_date=future_date,
            end_date=self.now + timedelta(weeks=10),
            enrollment_start=future_date,
            enrollment_end=self.now + timedelta(weeks=2),
        )
        assert get_course_enrollment_text(course) == start_date + enr_start

    def test_future_course_enr_open(self):
        """Test course in the future, enrollment open"""
        future_date = self.now + timedelta(weeks=1)
        start_date = 'Starts {:%D} - Enrollment Open'.format(future_date)
        course = CourseFactory.create(title="Starts soon, Enrollment open")
        # and a run is about to start and enrollment is open
        CourseRunFactory.create(
            course=course,
            start_date=future_date,
            end_date=self.now + timedelta(weeks=10),
            enrollment_start=self.now - timedelta(weeks=1),
            enrollment_end=self.now + timedelta(weeks=10),
        )
        assert get_course_enrollment_text(course) == start_date

    def test_future_course_no_enr_end(self):
        """Test course in the future, enrollment_end is None"""
        future_date = self.now + timedelta(weeks=1)
        text = 'Starts {:%D} - Enrollment Open'.format(future_date)
        course = CourseFactory.create(title="Starts soon, no enr_end date")
        CourseRunFactory.create(
            course=course,
            start_date=future_date,
            end_date=self.now + timedelta(weeks=10),
            enrollment_start=self.now - timedelta(weeks=1),
            enrollment_end=None
        )
        assert get_course_enrollment_text(course) == text

    def test_current_course(self):
        """Test current course, enrollment ends soon"""
        course = CourseFactory.create(title="Ongoing, Enrollment ends")
        text = 'Ongoing - Enrollment Ends {:%D}'.format(self.now + timedelta(weeks=10))
        CourseRunFactory.create(
            course=course,
            start_date=self.now - timedelta(weeks=1),
            end_date=self.now + timedelta(weeks=10),
            enrollment_start=self.now - timedelta(weeks=1),
            enrollment_end=self.now + timedelta(weeks=10),
        )
        assert get_course_enrollment_text(course) == text

    def test_current_course_no_enr_end(self):
        """Test current course, enrollment open"""
        course = CourseFactory.create(title="Ongoing, Enrollment open")
        CourseRunFactory.create(
            course=course,
            start_date=self.now - timedelta(weeks=1),
            end_date=None,
            enrollment_start=self.now - timedelta(weeks=1),
            enrollment_end=None,
        )
        assert get_course_enrollment_text(course) == 'Ongoing - Enrollment Open'

    def test_course_fuzzy_start_date(self):
        """Test course with promised course run"""
        course = CourseFactory.create(title="Promised in the future")
        CourseRunFactory.create(
            course=course,
            fuzzy_start_date="Fall 2017",
            start_date=None,
            end_date=None,
            enrollment_start=None,
            enrollment_end=None,
        )
        assert get_course_enrollment_text(course) == 'Coming Fall 2017'

    def test_current_course_enr_closed(self):
        """Test current course, enrollment closed"""
        course = CourseFactory.create(title="Starts soon, Enrollment closed")
        CourseRunFactory.create(
            course=course,
            start_date=self.now - timedelta(weeks=1),
            end_date=self.now + timedelta(weeks=10),
            enrollment_start=self.now - timedelta(weeks=2),
            enrollment_end=self.now - timedelta(weeks=1),
        )
        assert get_course_enrollment_text(course) == 'Not available'
