from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

# class EmailOrMobileBackend(ModelBackend):
#     def authenticate(self, request, username=None, password=None, **kwargs):
#         user = None
#         try:
#             if '@' in username:
#                 user = User.objects.get(email=username)
#             else:
#                 user = User.objects.get(mobile_no=username)
#         except User.DoesNotExist:
#             return None

#         if user.check_password(password) and self.user_can_authenticate(user):
#             return user
#         return None



class EmailOrMobileBackend(ModelBackend):

    def authenticate(self, request, username=None, password=None, **kwargs):

        identifier = (
            username
            or kwargs.get("email")
            or kwargs.get("mobile_no")
        )

        if not identifier or not password:
            return None

        try:
            if "@" in identifier:
                user = User.objects.get(email=identifier)
            else:
                user = User.objects.get(mobile_no=identifier)

        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None