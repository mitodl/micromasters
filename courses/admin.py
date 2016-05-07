"""Admin views for Courses & Programs"""
from django.contrib import admin
from .models import Course, CourseRun, Program


class ProgramAdmin(admin.ModelAdmin):
    """ModelAdmin for Programs"""
    list_display = ('title', 'live',)
    list_filter = ('live',)


class CourseRunInline(admin.StackedInline):
    """Admin Inline for CourseRun objects"""
    model = CourseRun
    extra = 1


class CourseAdmin(admin.ModelAdmin):
    """ModelAdmin for Courses"""
    list_display = ('sort_order', 'title',)
    list_filter = ('program__live',)
    inlines = [CourseRunInline]
    ordering = ('sort_order',)


class CourseRunAdmin(admin.ModelAdmin):
    """ModelAdmin for Courses"""
    list_display = ('title', 'program',)
    list_filter = ('course__program__live',)

    def program(self, run):  # pylint: disable=no-self-use
        """method to show program for list display."""
        return run.course.program


admin.site.register(CourseRun, CourseRunAdmin)
admin.site.register(Course, CourseAdmin)
admin.site.register(Program, ProgramAdmin)
