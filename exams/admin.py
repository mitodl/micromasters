
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


class ExamAuthorizationAdmin(admin.ModelAdmin):
    """Admin for ExamAuthorization"""

    model = models.ExamAuthorization
    list_display = (
        'id',
        'user_email',
        'course_number',
        'exam_run_id',
        'exam_coupon_url',
    )
    list_filter = (
        'exam_run__id',
        'course__course_number',
        'course__title',
    )
    search_fields = (
        'exam_run__id',
        'course__course_number',
    )
    raw_id_fields = ('user',)

    def user_email(self, obj):
        """Getter for the User foreign-key element email"""
        return obj.user.email

    def course_number(self, obj):
        """Getter for the Course foreign-key element course_number"""
        return obj.course.course_number

    def exam_run_id(self, obj):
        """Getter for the ExamRun foreign-key element id"""
        return obj.exam_run.id


class ExamRunCouponAdmin(admin.ModelAdmin):
    """Admin for ExamRunCoupon"""
    model = models.ExamRunCoupon
    list_display = (
        'id',
        'is_taken',
        'course_title',
        'coupon_url',
        'expiration_date',
    )
    list_filter = (
        'is_taken',
        'course__title',
    )

    def course_title(self, obj):
        """Getter for the Course foreign-key element course_number"""
        return obj.course.title


admin.site.register(models.ExamRun, ExamRunAdmin)
admin.site.register(models.ExamAuthorization, ExamAuthorizationAdmin)
admin.site.register(models.ExamRunCoupon, ExamRunCouponAdmin)
