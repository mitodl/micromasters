"""Tests for the catalog serializers"""
import pytest

from cms.models import ProgramFaculty
from cms.factories import ProgramPageFactory
from courses.catalog_serializers import CatalogProgramSerializer
from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
)


@pytest.mark.django_db
@pytest.mark.usefixtures("mocked_elasticsearch")
@pytest.mark.parametrize("has_page", [True, False])
@pytest.mark.parametrize("has_thumbnail", [True, False])
def test_catalog_program_serializer(has_page, has_thumbnail):
    """Tests that the catalog serializer returns a correct data structure"""
    page = ProgramPageFactory.create(has_thumbnail=has_thumbnail) if has_page else None
    program = page.program if page else ProgramFactory.create()
    courses = CourseFactory.create_batch(3, program=program)
    for course in courses:
        CourseRunFactory.create_batch(2, course=course)
    faculty_name = "faculty"
    if has_page:
        ProgramFaculty.objects.create(
            program_page=page,
            name=faculty_name,
        )
    serialized = CatalogProgramSerializer(program).data
    # coerce OrderedDict objects to dict
    serialized = {
        **serialized,
        "courses": [
            {
                **course,
                "course_runs": [dict(run) for run in course["course_runs"]]
            } for course in serialized["courses"]
        ]
    }
    assert serialized == {
        "id": program.id,
        "title": program.title,
        "programpage_url": page.get_full_url() if has_page else None,
        "thumbnail_url": (
            page.thumbnail_image.get_rendition('fill-300x186').url
            if has_page and has_thumbnail else None
        ),
        "courses": [{
            "id": course.id,
            "edx_key": course.edx_key,
            "position_in_program": course.position_in_program,
            "course_runs": [{
                "id": course_run.id,
                "edx_course_key": course_run.edx_course_key,
            } for course_run in course.courserun_set.all()]
        } for course in courses],
        'topics': [{'name': topic.name} for topic in program.topics.iterator()],
        "instructors": [{"name": faculty_name}] if has_page else [],
        "start_date": courses[0].first_unexpired_run().start_date,
        "enrollment_start": courses[0].first_unexpired_run().enrollment_start,
        "end_date": courses[-1].courserun_set.last().end_date,
        "total_price": str(program.price * program.num_required_courses),
    }
