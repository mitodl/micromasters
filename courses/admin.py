"""
Admin views for Courses & Programs
"""

from django.contrib import admin

from courses.models import Course, CourseRun, Program, ElectivesSet, ElectiveCourse, Topic


class CourseInline(admin.StackedInline):
    """Admin Inline for Course objects"""
    model = Course
    extra = 1
    show_change_link = True


class CourseRunInline(admin.StackedInline):
    """Admin Inline for CourseRun objects"""
    model = CourseRun
    extra = 1
    show_change_link = True


class ProgramAdmin(admin.ModelAdmin):
    """ModelAdmin for Programs"""
    list_display = ('title', 'live',)
    list_filter = ('live', 'topics')
    inlines = [CourseInline]


class CourseAdmin(admin.ModelAdmin):
    """ModelAdmin for Courses"""
    list_display = ('title', 'course_number', 'program_title', 'position_in_program',)
    list_filter = ('program__live', 'program',)
    inlines = [CourseRunInline]
    ordering = ('program__title', 'position_in_program',)

    def program_title(self, course):
        """Getter for the foreign key element"""
        return course.program.title


class CourseRunAdmin(admin.ModelAdmin):
    """ModelAdmin for Courses"""
    list_display = ('title', 'course_number', 'edx_course_key', 'enrollment_start', 'start_date', 'enrollment_end',
                    'end_date', 'upgrade_deadline', 'freeze_grade_date', )
    list_filter = ('course__program__live', 'course__program', 'course', 'course__course_number', )
    list_editable = ('enrollment_start', 'start_date', 'enrollment_end', 'end_date', 'upgrade_deadline',
                     'freeze_grade_date', )
    ordering = ('course__title', 'course__program__title', 'course__position_in_program', )

    def program(self, run):
        """method to show program for list display."""
        return run.course.program.title

    def course(self, run):
        """Getter for course foreign key"""
        return run.course.title

    def course_number(self, run):
        """Getter for course's course_number"""
        return run.course.course_number


class ElectivesSetAdmin(admin.ModelAdmin):
    """ModelAdmin for ElectivesSet"""
    list_display = ('program', 'required_number', 'title',)
    list_filter = ('program',)


class ElectiveCourseAdmin(admin.ModelAdmin):
    """ModelAdmin for ElectiveCourse"""
    list_display = ('course', 'electives_set',)


class TopicAdmin(admin.ModelAdmin):
    """ModelAdmin for Programs"""
    list_display = ('name',)


admin.site.register(CourseRun, CourseRunAdmin)
admin.site.register(Course, CourseAdmin)
admin.site.register(Program, ProgramAdmin)
admin.site.register(ElectivesSet, ElectivesSetAdmin)
admin.site.register(ElectiveCourse, ElectiveCourseAdmin)
admin.site.register(Topic, TopicAdmin)
