
from django.urls import path, include
from django.contrib.auth import views as auth_views
from .views import (
    GoogleLogin, PasswordResetRequestView, PasswordResetConfirmView,
    StaffViewSet, RoleViewSet, MeView, ChangePasswordView,
    BranchManagementViewSet, SiteManagementViewSet,
    MessageTemplateViewSet, SendEmailView
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'roles', RoleViewSet, basename='roles') 
router.register(r'branch', BranchManagementViewSet, basename='branch')
router.register(r'site', SiteManagementViewSet, basename='sites')
router.register(r'message-templates', MessageTemplateViewSet, basename='message-templates')

urlpatterns = [
    path('dj-rest-auth/', include('dj_rest_auth.urls')),
    path('dj-rest-auth/registration/', include('dj_rest_auth.registration.urls')),
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("send-email/", SendEmailView.as_view(), name="send-email"),
]

urlpatterns += router.urls