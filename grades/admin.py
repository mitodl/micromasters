"""
Admin for the grades app
"""
from django.contrib import admin

from grades import models
from micromasters.utils import get_field_names


class FinalGradeAdmin(admin.ModelAdmin):
    """Admin for FinalGrade"""
    model = models.FinalGrade
    list_display = ('id', 'grade', 'user', 'course_run', )
    ordering = ('course_run',)
    raw_id_fields = ('user',)
    search_fields = (
        'user__username',
    )

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
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

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False


class CourseRunGradingStatusAdmin(admin.ModelAdmin):
    """Admin for CourseRunGradingStatus"""
    model = models.CourseRunGradingStatus
    list_display = ('id', 'course_run', 'status')
    ordering = ('course_run',)


class ProctoredExamGradeAdmin(admin.ModelAdmin):
    """Admin for ProctoredExamGrade"""
    model = models.ProctoredExamGrade
    list_display = ('id', 'user', 'course', )
    ordering = ('course', 'user')
    raw_id_fields = ('user',)
    search_fields = (
        'user__username',
    )

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False

    def save_model(self, request, obj, form, change):
        """
        Saves object and logs change to object
        """
        obj.save_and_log(request.user)


class ProctoredExamGradeAuditAdmin(admin.ModelAdmin):
    """Admin for ProctoredExamGradeAudit"""
    model = models.ProctoredExamGradeAudit
    readonly_fields = get_field_names(models.ProctoredExamGradeAudit)
    list_display = ('id', 'proctored_exam_grade', )
    ordering = ('proctored_exam_grade', 'id', )
    list_filter = ('proctored_exam_grade__course__title', )

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False

    def has_delete_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False


class MicromastersCourseCertificateAdmin(admin.ModelAdmin):
    """Admin for MicromastersCourseCertificate"""
    model = models.MicromastersCourseCertificate
    list_display = ('id', 'user_username', 'course', 'hash', 'created_on')
    list_filter = ('course', )
    raw_id_fields = ('user',)
    search_fields = (
        'user__username',
        'user__email',
    )

    def user_username(self, obj):  # pylint: disable=missing-docstring
        return obj.user.username

    def has_add_permission(self, *args, **kwargs):  # pylint: disable=unused-argument, arguments-differ
        return False

    user_username.short_description = 'User'


admin.site.register(models.FinalGrade, FinalGradeAdmin)
admin.site.register(models.FinalGradeAudit, FinalGradeAuditAdmin)
admin.site.register(models.CourseRunGradingStatus, CourseRunGradingStatusAdmin)
admin.site.register(models.ProctoredExamGrade, ProctoredExamGradeAdmin)
admin.site.register(models.ProctoredExamGradeAudit, ProctoredExamGradeAuditAdmin)
admin.site.register(models.MicromastersCourseCertificate, MicromastersCourseCertificateAdmin)
