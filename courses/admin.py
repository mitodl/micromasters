"""
Admin views for Courses & Programs
"""

from django.contrib import admin

from courses.models import Course, CourseRun, Program


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
    list_filter = ('live',)
    inlines = [CourseInline]


class CourseAdmin(admin.ModelAdmin):
    """ModelAdmin for Courses"""
    list_display = ('title', 'program_title', 'position_in_program',)
    list_filter = ('program__live',)
    inlines = [CourseRunInline]
    ordering = ('program__title', 'position_in_program',)

    def program_title(self, course):
        """Getter for the foreign key element"""
        return course.program.title


class CourseRunAdmin(admin.ModelAdmin):
    """ModelAdmin for Courses"""
    list_display = ('title', 'edx_course_key', 'course', 'program',)
    list_filter = ('course__program__live',)
    ordering = ('course__title', 'course__program__title', 'course__position_in_program',)

    def program(self, run):
        """method to show program for list display."""
        return run.course.program.title

    def course(self, run):
        """Getter for course foreign key"""
        return run.course.title


admin.site.register(CourseRun, CourseRunAdmin)
admin.site.register(Course, CourseAdmin)
admin.site.register(Program, ProgramAdmin)
