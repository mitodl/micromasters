"""
Classes related to models for MicroMasters
"""

from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.db import transaction
from django.db.models import (
    DateTimeField,
    ForeignKey,
    Model,
    SET_NULL,
)


class AuditModel(Model):
    """An abstract base class for audit models"""

    acting_user = ForeignKey(User, null=True, on_delete=SET_NULL)
    created_on = DateTimeField(auto_now_add=True)
    updated_on = DateTimeField(auto_now=True)
    data_before = JSONField(blank=True, null=True)
    data_after = JSONField(blank=True, null=True)

    class Meta:
        abstract = True

    @property
    def related_field_name(self):
        """
        Returns:
            str: A field name which links the Auditable model to this model
        """
        raise NotImplementedError


class AuditableModel(Model):
    """An abstract base class for auditable models"""

    class Meta:
        abstract = True

    def to_dict(self):
        """
        Returns:
            dict:
                A serialized representation of the model object
        """
        raise NotImplementedError

    @property
    def audit_class(self):
        """
        Returns:
            class of Model:
                A class of a Django model used as the audit table
        """
        raise NotImplementedError

    @transaction.atomic
    def save_and_log(self, acting_user, before_obj, *args, **kwargs):
        """
        Saves the object and creates an audit object.

        Args:
            acting_user (django.contrib.auth.models.User):
                The user who made the change to the model. May be None if inapplicable.
            before_obj (Model):
                The model before it was altered. May be None if model is new.
        """
        self.save(*args, **kwargs)
        self.refresh_from_db()
        before_dict = None
        if before_obj is not None:
            before_dict = before_obj.to_dict()

        audit_kwargs = dict(
            acting_user=acting_user,
            data_before=before_dict,
            data_after=self.to_dict(),
        )
        audit_kwargs[self.audit_class.related_field_name] = self
        self.audit_class.objects.create(**audit_kwargs)

