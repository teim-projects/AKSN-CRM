from dj_rest_auth.registration.serializers import RegisterSerializer 
from dj_rest_auth.serializers import LoginSerializer
from dj_rest_auth.serializers import UserDetailsSerializer
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from rest_framework import serializers
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from .models import CustomUser, Role, BranchManagement, SiteManagement, MessageTemplate
from rest_framework.exceptions import ValidationError
from django.core.validators import RegexValidator
import re

class CustomRegisterSerializer(RegisterSerializer):
    username = None  # disable username completely
    mobile_no = serializers.CharField(required=False, allow_blank=True, max_length=15)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['mobile_no'] = self.validated_data.get('mobile_no', '')
        return data

    def save(self, request):
        user = super().save(request)
        user.mobile_no = self.validated_data.get('mobile_no', '')
        user.save()
        return user


User = get_user_model()

class CustomLoginSerializer(LoginSerializer):
    username = None
    email_or_mobile = serializers.CharField(required=True)
    password = serializers.CharField(style={'input_type': 'password'})

    def validate(self, attrs):
        email_or_mobile = attrs.get('email_or_mobile')
        password = attrs.get('password')

        if not email_or_mobile or not password:
            raise serializers.ValidationError("Both email/mobile and password are required.")

        user = authenticate(username=email_or_mobile, password=password)

        if not user:
            try:
                if '@' in email_or_mobile:
                    user = User.objects.get(email=email_or_mobile)
                else:
                    user = User.objects.get(mobile_no=email_or_mobile)
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials.")
            if not user.check_password(password):
                raise serializers.ValidationError("Invalid credentials.")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")

        attrs['user'] = user
        return attrs



class CustomUserDetailsSerializer(UserDetailsSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'mobile_no', 'first_name', 'last_name', 'role', 'profile_photo')
        read_only_fields = ()

    def validate_email(self, value):
        if value:
            value = value.strip().lower()
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                if CustomUser.objects.filter(email__iexact=value).exclude(pk=request.user.pk).exists():
                    raise serializers.ValidationError("A user with this email address already exists.")
        return value

    def to_internal_value(self, instance):
        internal = super().to_internal_value(instance)

        full_name = instance.get("full_name")
        if full_name:
            parts = full_name.strip().split()
            internal['first_name'] = parts[0]
            internal['last_name'] = ' '.join(parts[1:]) if len(parts) > 1 else ""

        if "mobile_no" in instance:
            internal["mobile_no"] = str(instance["mobile_no"]).replace(" ", "").strip() 

        return internal       

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['full_name'] = f"{instance.first_name or ''} {instance.last_name or ''}".strip()
        return rep
    


User = get_user_model()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email_clean = value.strip().lower()
        try:
            user = User.objects.get(email__iexact=email_clean)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email.")
        self.context['user'] = user
        return email_clean

    def save(self):
        user = self.context['user']
        configured_email = getattr(settings, 'EMAIL_HOST_USER', 'girsawaleritesh5@gmail.com')
        admin_email = getattr(settings, 'ADMIN_EMAIL', configured_email)
        
        is_admin = (
            getattr(user, 'is_superuser', False) or 
            (user.email and user.email.lower() == configured_email.lower()) or
            (hasattr(user, 'role') and user.role and user.role.name.lower() == 'admin')
        )

        user_display_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email

        if is_admin:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PasswordResetTokenGenerator().make_token(user)

            frontend_url = getattr(settings, "FRONTEND_URL", None) or "http://localhost:5173/password-reset-confirm"
            reset_link = f"{frontend_url}/{uid}/{token}/"

            subject = "Admin Password Reset Request"
            body = (
                f"Hello Admin ({user_display_name}),\n\n"
                f"We received a request to reset your password for AKSN CRM Admin account.\n\n"
                f"Please click the link below to set a new password:\n"
                f"{reset_link}\n\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"Regards,\nAKSN CRM Security Team"
            )

            recipients = list(set(filter(None, [user.email, configured_email, admin_email])))
            try:
                email_msg = EmailMultiAlternatives(subject, body, settings.DEFAULT_FROM_EMAIL, recipients)
                email_msg.send(fail_silently=False)
            except Exception as e:
                print("Failed to send admin reset email:", e)

            return {
                "detail": "Admin password reset link sent to your email address.",
                "is_admin": True,
                "user_id": user.pk,
                "email": user.email
            }
        else:
            # Staff user request -> send email notification to Admin
            subject = f"Password Change Requested by Staff: {user_display_name}"
            body = (
                f"Hello Admin,\n\n"
                f"Staff member '{user_display_name}' ({user.email}) has submitted a password change request in AKSN CRM.\n\n"
                f"Staff Details:\n"
                f"- Name: {user_display_name}\n"
                f"- Email: {user.email}\n"
                f"- User ID: {user.pk}\n\n"
                f"Please log in to AKSN CRM and go to Accounts / Staff Management to update their password.\n\n"
                f"Regards,\nAKSN CRM Notification System"
            )

            recipients = list(set(filter(None, [configured_email, admin_email])))
            try:
                email_msg = EmailMultiAlternatives(subject, body, settings.DEFAULT_FROM_EMAIL, recipients)
                email_msg.send(fail_silently=False)
            except Exception as e:
                print("Failed to send staff request email to admin:", e)

            return {
                "detail": f"Password change request for staff user ({user.email}) has been submitted to Admin.",
                "is_admin": False,
                "user_id": user.pk,
                "user_name": user_display_name,
                "email": user.email
            }


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        uidb64 = attrs.get("uidb64")
        token = attrs.get("token")
        new_password = attrs.get("new_password")

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uidb64": "Invalid UID."})

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, token):
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        user.set_password(new_password)
        user.save()

        return {"detail": "Password has been reset successfully."}

# ---RoleSerializer----
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('id', 'name', 'permissions')
        read_only_fields = ('id',)

# Staff Profile section
class RoleFlexibleField(serializers.RelatedField):
    """
    Accepts either:
      - integer id (e.g. 3)
      - string id (e.g. "3")
      - role name (e.g. "staff" or "Staff")
    Represents role in responses as {"id": id, "name": name, "permissions": permissions}
    """
    def to_internal_value(self, data):
        # integer id or numeric string -> pk
        if isinstance(data, int) or (isinstance(data, str) and data.isdigit()):
            try:
                pk = int(data)
                return Role.objects.get(pk=pk)
            except Role.DoesNotExist:
                raise ValidationError(f"Role with id={data} does not exist.")
        # string -> treat as name (case-insensitive)
        if isinstance(data, str):
            try:
                return Role.objects.get(name__iexact=data)
            except Role.DoesNotExist:
                raise ValidationError(f"Role with name='{data}' does not exist.")
        raise ValidationError("Invalid role value. Provide a role id or name.")

    def to_representation(self, value):
        return {
            "id": value.id,
            "name": value.name,
            "permissions": value.permissions or {}
        }


PHONE_10_DIGIT_RE = r'^\d{10}$'
phone_validator = RegexValidator(
    regex=PHONE_10_DIGIT_RE,
    message='Mobile number must consist of exactly 10 digits.'
)

class AddStaffSerializer(serializers.ModelSerializer):
    # enforce 10 digits at serializer level
    mobile_no = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10,
        validators=[phone_validator],
        help_text="10 digit mobile number (digits only)."
    )

    role = RoleFlexibleField(queryset=Role.objects.all(), required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'mobile_no', 'first_name', 'last_name', 'role', 'password')
        read_only_fields = ('id',)

    def validate(self, attrs):
        # strip whitespace from mobile if present
        mobile = attrs.get('mobile_no')
        if mobile is not None:
            mobile = mobile.strip()
            if mobile == '':
                # treat blank as not provided
                attrs.pop('mobile_no', None)
            else:
                attrs['mobile_no'] = mobile

        # require at least one contact
        if not attrs.get('email') and not attrs.get('mobile_no'):
            raise serializers.ValidationError("Either email or mobile_no is required.")

        # mobile_no validator will have already run via field validators; 
        # but double-check defensive: ensure digits only and length 10 if present
        mobile = attrs.get('mobile_no')
        if mobile:
            if not re.match(PHONE_10_DIGIT_RE, mobile):
                raise serializers.ValidationError({"mobile_no": "Mobile number must be exactly 10 digits."})

        return attrs

    def _creator_is_admin_or_subadmin_or_super(self, creator):
        if creator is None:
            return False
        if getattr(creator, 'is_superuser', False):
            return True
        creator_role_name = getattr(getattr(creator, 'role', None), 'name', '') or ''
        return creator_role_name.lower() in ('admin', 'subadmin')

    def create(self, validated_data):
        request = self.context.get('request', None)
        creator = getattr(request, 'user', None)

        requested_role = validated_data.pop('role')  # Role instance from RoleFlexibleField
        password = validated_data.pop('password')

        if not self._creator_is_admin_or_subadmin_or_super(creator):
            raise ValidationError("You do not have permission to assign roles.")

        # create user via manager
        user = CustomUser.objects.create_user(role=requested_role, password=password, **validated_data)
        user.is_staff = True
        user.save()
        return user

    def update(self, instance, validated_data):
        request = self.context.get('request', None)
        creator = getattr(request, 'user', None)

        requested_role = validated_data.get('role', None)
        if requested_role is not None:
            if not self._creator_is_admin_or_subadmin_or_super(creator):
                raise ValidationError("You do not have permission to change role.")
            instance.role = requested_role
            validated_data.pop('role', None)

        if 'password' in validated_data:
            instance.set_password(validated_data.pop('password'))

        # ensure mobile_no whitespace trimmed if present
        if 'mobile_no' in validated_data and isinstance(validated_data['mobile_no'], str):
            validated_data['mobile_no'] = validated_data['mobile_no'].strip()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance




# --------------------------------------------------------------------------------
# Branch Management Serializer
# --------------------------------------------------------------------------------


class BranchSerializers(serializers.ModelSerializer):
    full_address = serializers.SerializerMethodField()

    class Meta:
        model = BranchManagement
        fields = "__all__"
        
    def validate_name(self, value):
        qs = BranchManagement.objects.filter(name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
             raise serializers.ValidationError("Branch with this name already exists.")
        return value
    
    
    
    def get_full_address(self, obj):
        return f"{obj.address}, {obj.city}, {obj.state} - {obj.pincode}"
    

class SiteSerializers(serializers.ModelSerializer):
    class Meta:
        model = SiteManagement
        fields = "__all__"
        read_only_fields = ("site_shortcut",)


class MessageTemplateSerializer(serializers.ModelSerializer):
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MessageTemplate
        fields = [
            'id',
            'name',
            'channel',
            'channel_display',
            'category',
            'category_display',
            'subject',
            'body',
            'is_active',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'created_by')

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.first_name or obj.created_by.email or str(obj.created_by)


    