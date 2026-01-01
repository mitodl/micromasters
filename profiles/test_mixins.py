"""
Reusable test mixins for profile tests
"""

class ProfileImageCleanupMixin:
    """
    Mixin to clean up profile image fields in tearDown to prevent ResourceWarning.
    
    This mixin provides automatic cleanup of image, image_small, and image_medium fields
    for profiles used in tests. By default, it looks for profiles in common attributes
    (self.profile, user1.profile, user2.profile), but can be customized by overriding
    _get_profiles_to_clean().
    
    Usage:
        class MyTestCase(ProfileImageCleanupMixin, TestCase):
            def setUp(self):
                super().setUp()
                self.profile = ProfileFactory.create()
            
            # tearDown is automatically handled by the mixin
    """
    
    def tearDown(self):
        """
        Clean up profile image files to prevent ResourceWarning.
        """
        for profile in self._get_profiles_to_clean():
            for field_name in ["image", "image_small", "image_medium"]:
                field = getattr(profile, field_name, None)
                if not field:
                    continue
                try:
                    # Close any open file handles
                    field.close()
                except (ValueError, OSError, AttributeError):
                    pass
                try:
                    # Delete files without triggering additional saves
                    field.delete(save=False)
                except (ValueError, OSError, AttributeError):
                    pass
        super().tearDown()
    
    def _get_profiles_to_clean(self):
        """
        Get the list of profiles to clean up.
        
        Override this method in subclasses if you need different profile selection logic.
        
        Returns:
            list: List of Profile instances to clean up
        """
        from profiles.models import Profile
        
        profiles = []
        
        # Check for self.profile
        if hasattr(self, 'profile'):
            profiles.append(self.profile)
        
        # Check for user1 and user2 (common pattern in view tests)
        for user_attr in ['user1', 'user2']:
            if hasattr(self, user_attr):
                user = getattr(self, user_attr)
                try:
                    profiles.append(Profile.objects.get(user=user))
                except Profile.DoesNotExist:
                    pass
        
        return profiles
