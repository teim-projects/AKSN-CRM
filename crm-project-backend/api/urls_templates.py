from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MessageTemplateViewSet, SendEmailView

router = DefaultRouter()
router.register(r'message-templates', MessageTemplateViewSet, basename='message-templates')

urlpatterns = [
    path('send-email/', SendEmailView.as_view(), name='send-email'),
    path('', include(router.urls)),
]
