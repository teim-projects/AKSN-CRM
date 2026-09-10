from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework.response import Response
from rest_framework import status
from google.oauth2 import id_token  # type: ignore
from google.auth.transport import requests  # type: ignore
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView 
from rest_framework import viewsets
from .serializers import PasswordResetRequestSerializer, PasswordResetConfirmSerializer
import os
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication 
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import CustomUser, Role, BranchManagement, SiteManagement, MessageTemplate
from .serializers import AddStaffSerializer, RoleSerializer, BranchSerializers, SiteSerializers, MessageTemplateSerializer
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .permissions import IsAdminOrSubAdmin ,StaffObjectPermission
from .pagination import StaffPagination
from rest_framework.decorators import action
User = get_user_model()

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    # callback_url = "http://127.0.0.1:8000/accounts/google/login/callback/"
    callback_url = os.getenv('GOOGLE_CALLBACK_URL')

    def post(self, request, *args, **kwargs):
        """
        Verify Google token → get/create user → issue JWT tokens.
        """
        token = request.data.get("access_token")
        if not token:
            return Response({"error": "Missing access_token"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # ✅ Verify token with Google
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                os.getenv('GOOGLE_CLIENT_ID')
                # "129181997839-0rlmm080229tetuka9c0i83la4r4lhdt.apps.googleusercontent.com"
            )

            email = idinfo.get("email")
            name = idinfo.get("name", "")
            picture = idinfo.get("picture", "")

            # ✅ Get or create user
            user, created = User.objects.get_or_create(email=email)
            if created:
                user.is_active = True
                if hasattr(user, "full_name"):
                    user.full_name = name
                if hasattr(user, "profile_photo") and picture:
                    user.profile_photo = picture
                user.save()

            # ✅ Generate JWT tokens for this user
            refresh = RefreshToken.for_user(user)
            data = {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "email": user.email,
                "name": name,
                "message": "Google login successful"
            }

            return Response(data, status=status.HTTP_200_OK)

        except ValueError as ve:
            return Response({"error": "Invalid Google token", "details": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# Custom password reset and set password 

class PasswordResetRequestView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password reset email sent."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


# Role section
class RoleViewSet(viewsets.ModelViewSet):
    """
    CRUD for Role model.
    Only accessible to admin/subadmin or superuser.
    """
    queryset = Role.objects.all().order_by('id')
    serializer_class = RoleSerializer
    authentication_classes = [JWTAuthentication]   
    permission_classes = [IsAuthenticated, IsAdminOrSubAdmin]
    pagination_class = None


# Add Staff section

class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = AddStaffSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSubAdmin, StaffObjectPermission]
    authentication_classes = [JWTAuthentication]  
    pagination_class = StaffPagination 
    filter_backends = [DjangoFilterBackend , filters.SearchFilter]
    search_fields = ['^first_name', '=email', 'mobile_no','role__name']
    filterset_fields = ['role']

    def get_queryset(self):
        return CustomUser.objects.filter(is_staff=True)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'], url_path='all' , permission_classes=[IsAuthenticated])
    def all_staff(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)



from rest_framework.views import APIView

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        role_data = None

        if user.role:
            role_data = {
                "id": user.role.id,
                "name": user.role.name,
                "permissions": user.role.permissions or {}
            }
        elif user.is_superuser:
            role_data = {"id": 1, "name": "admin", "permissions": {}}
        else:
            role_data = {"id": 0, "name": "staff", "permissions": {}}

        return Response({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
            "mobile_no": user.mobile_no,
            "is_superuser": user.is_superuser,
            "is_staff": user.is_staff,
            "role": role_data
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password") or request.data.get("new_password1")

        if not new_password or len(new_password) < 6:
            return Response({"error": "New password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        if old_password:
            if not user.check_password(old_password):
                return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)




# --------------------------------------------------------------------------------
# Branch Management Viewsets
# --------------------------------------------------------------------------------

class BranchManagementViewSet(viewsets.ModelViewSet):
    queryset = BranchManagement.objects.all()
    serializer_class = BranchSerializers
    authentication_classes = [JWTAuthentication]   
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = [
        'name', '=email', 'primary_contact',
        'city', 'state',
    ]
    filterset_fields = ['city', 'state']


# --------------------------------------------------------------------------------
# Site Management Viewsets
# --------------------------------------------------------------------------------

class SiteManagementViewSet(viewsets.ModelViewSet):
    queryset = SiteManagement.objects.all()
    serializer_class = SiteSerializers
    authentication_classes = [JWTAuthentication]   
    permission_classes = [IsAuthenticated]
    filter_backends = [ filters.SearchFilter]
    search_fields = [
        'name',"pincode","owner_contact","owner_name",
        'city', 'state',
    ]


# --------------------------------------------------------------------------------
# Message Template ViewSet & Send Email View
# --------------------------------------------------------------------------------

class MessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['channel', 'category', 'is_active']
    search_fields = ['name', 'subject', 'body']
    ordering_fields = ['created_at', 'name', 'category']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)


class SendEmailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        to_email = request.data.get('to_email')
        subject = (request.data.get('subject') or '').strip()
        # Accept both 'body' and 'message' parameter
        message = (request.data.get('body') or request.data.get('message') or '').strip()
        html_message = request.data.get('html_message', None)
        category = request.data.get('category')
        record_id = request.data.get('record_id') or request.data.get('quotation_id')
        attach_quotation_pdf = request.data.get('attach_quotation_pdf', False)

        if not to_email:
            return Response({"error": "Recipient email ('to_email') is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not subject:
            return Response({"error": "Subject is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not message and not html_message:
            return Response({"error": "Message body is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Parse recipient list
        recipients = [e.strip() for e in str(to_email).split(',') if e.strip()]
        if not recipients:
            return Response({"error": "Invalid recipient email address."}, status=status.HTTP_400_BAD_REQUEST)

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@aksninfotech.com')

        try:
            email_msg = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=from_email,
                to=recipients
            )
            if html_message:
                email_msg.attach_alternative(html_message, "text/html")

            # Handle optional Quotation PDF attachment
            if attach_quotation_pdf and record_id:
                try:
                    from quotation.models import Quotation
                    from quotation.utils.pdf_generator import generate_quotation_pdf
                    quotation = Quotation.objects.filter(id=record_id).first()
                    if quotation:
                        active_version = quotation.versions.filter(is_active=True).first() or quotation.versions.first()
                        if active_version:
                            pdf_bytes = generate_quotation_pdf(quotation, active_version)
                            filename = f"Quotation_{quotation.quotation_no or quotation.id}.pdf"
                            email_msg.attach(filename, pdf_bytes, 'application/pdf')
                except Exception as pdf_err:
                    import logging
                    logging.getLogger(__name__).warning(f"Could not attach quotation PDF: {pdf_err}")

            email_msg.send(fail_silently=False)
            return Response({
                "status": "success",
                "success": True,
                "message": f"Email successfully sent to {', '.join(recipients)}",
                "to": recipients,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "status": "error",
                "success": False,
                "error": f"Failed to send email: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    