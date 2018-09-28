
"""
Admin for the grades app
"""
from django.contrib import admin

from exams import models


class ExamRunAdmin(admin.ModelAdmin):
    """Admin for ExamRun"""
    model = models.ExamRun
    list_display = (
        'id',
        'course',
        'semester',
        'exam_series_code',
        'date_first_schedulable',
        'date_last_schedulable',
        'date_first_eligible',
        'date_last_eligible',
        'authorized',
    )
    list_filter = ('course__title', 'course__program__title', 'semester', )
    ordering = ('-date_first_eligible',)
    readonly_fields = ('authorized',)

    def get_readonly_fields(self, request, obj=None):
        """Conditionally determine readonly fields"""
        if not self.is_modifiable(obj):
            # exam_series_code cannot be changed due to Pearson requirement
            return self.readonly_fields + ('exam_series_code',)
        return self.readonly_fields

    def has_delete_permission(self, request, obj=None):
        """Whether record can be deleted or not"""
        return self.is_modifiable(obj)

    def is_modifiable(self, exam_run):
        """
        Determines if an ExamRun can be modified/deleted

        Returns:
            bool: True if the run can be modified/deleted
        """
        return exam_run is None or exam_run.id is None or not exam_run.has_authorizations


admin.site.register(models.ExamRun, ExamRunAdmin)
