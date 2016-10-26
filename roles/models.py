"""
General models for the micromasters app
"""

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models, transaction

from courses.models import Program
from roles.roles import Staff, Instructor


# List need to update when new roles added,
# roles which are not learners.
NON_LEARNERS = [
    Staff.ROLE_ID,
    Instructor.ROLE_ID
]


class Role(models.Model):
    """
    Assignment of a MicroMasters Role per program to a user.

    The role names MUST have a correspondent logical role in roles.py
    and the name MUST be a snake-case version of the correspondent class name
    Example: if the logical role class in roles.py is `FooRole`, the
    instance here must me `foo_role`.
    """
    ASSIGNABLE_ROLES = [Staff.ROLE_ID, Instructor.ROLE_ID]
    DEFAULT_ROLE = Staff.ROLE_ID

    user = models.ForeignKey(User)
    program = models.ForeignKey(Program)
    role = models.CharField(
        choices=[(role_id, role_id) for role_id in ASSIGNABLE_ROLES],
        default=DEFAULT_ROLE,
        max_length=30,
    )

    class Meta:
        unique_together = ('user', 'program', 'role',)

    @transaction.atomic
    def save(self, *args, **kwargs):
        """
        Overridden method to run a preventive validation before saving the object.
        """
        self.full_clean()
        super(Role, self).save(*args, **kwargs)

    def full_clean(self, *args, **kwargs):
        """
        Overridden method to run a preventive validation.
        """
        # try to get all the roles different from the current one
        existing_role_queryset = Role.objects.filter(user=self.user).exclude(role=self.role)
        # exclude the current object in case it going to be modified
        if self.pk is not None:
            existing_role_queryset = existing_role_queryset.exclude(pk=self.pk)
        if existing_role_queryset.exists():
            raise ValidationError(
                'The user has the role "{0}" assigned at the moment and cannot have a second one. '
                'This is a technical limitation planned to be solved in the future.'.format(
                    existing_role_queryset.first().role
                )
            )
        super(Role, self).full_clean(*args, **kwargs)
