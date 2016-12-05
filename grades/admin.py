"""
Admin for the grades app
"""
from django.contrib import admin

from grades import models
from micromasters.utils import get_field_names


class FinalGradeAdmin(admin.ModelAdmin):
    """Admin for FinalGradeA"""
    model = models.FinalGrade
    list_display = ('id', 'grade', 'user', 'course_run', )
    ordering = ('course_run',)

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument
        return False

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class FinalGradeAuditAdmin(admin.ModelAdmin):
    """Admin for FinalGradeAudit"""
    model = models.FinalGradeAudit
    readonly_fields = get_field_names(models.FinalGradeAudit)
    list_display = ('id', 'final_grade', )
    ordering = ('final_grade', 'id', )
    list_filter = ('final_grade__course_run__edx_course_key', )

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument
        return False

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument
        return False


admin.site.register(models.FinalGrade, FinalGradeAdmin)
admin.site.register(models.FinalGradeAudit, FinalGradeAuditAdmin)
