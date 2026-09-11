import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication

from lead_management.models import lead_management
from product_management.models import Product
from amc.models import AMCContract
from api.permissions import is_admin_or_subadmin

from .services import ask_gemini_assistant

logger = logging.getLogger(__name__)

SUGGESTED_QUESTIONS = [
    "How do I add a new lead?",
    "What are my follow-ups today?",
    "How many active leads are assigned to me?",
    "What are the different pipeline stages?",
    "How do I create a quotation for a lead?",
]

def get_user_live_context(user, current_page=None):
    """Fetch real-time snapshot of the logged-in user, their role, permissions, and live metrics."""
    if not user or not user.is_authenticated:
        return {
            "is_authenticated": False,
            "current_page": current_page or "General",
        }

    today = timezone.localdate()
    role_name = getattr(user.role, "name", "Staff") if hasattr(user, "role") and user.role else ("Admin" if user.is_superuser else "Staff")
    admin_flag = is_admin_or_subadmin(user)
    user_display = f"{user.first_name} {user.last_name}".strip() or user.email

    context = {
        "is_authenticated": True,
        "name": user_display,
        "email": user.email,
        "role": role_name,
        "is_admin": admin_flag,
        "current_page": current_page or "Dashboard",
    }

    try:
        leads_qs = lead_management.objects.all()
        if not admin_flag:
            leads_qs = leads_qs.filter(assigned_executive=user)

        context["active_assigned_leads"] = leads_qs.filter(status="open").count()
        context["leads_created_by_user"] = lead_management.objects.filter(created_by=user).count()
        context["today_followups"] = leads_qs.filter(followup_date=today, status="open").count()
        context["overdue_followups"] = leads_qs.filter(followup_date__lt=today, status="open").count()
        context["won_leads_count"] = leads_qs.filter(status="close_win").count()

        # Product catalog
        context["total_products_in_catalog"] = Product.objects.filter(status="ACTIVE").count()

        # AMC
        amc_qs = AMCContract.objects.all()
        if not admin_flag:
            amc_qs = amc_qs.filter(support_coordinator=user)
        context["active_amcs"] = amc_qs.filter(status__in=["active", "expiring_soon"]).count()

    except Exception as e:
        logger.warning(f"Could not load full user context: {e}")

    return context


class ChatbotAskView(APIView):
    """
    API View to interact with the CRM AI Assistant.
    Accepts:
        POST { 
            "message": "user question", 
            "history": [...], 
            "current_page": "Leads" 
        }
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "status": "online",
            "assistant_name": "AKSN CRM Guide",
            "suggestions": SUGGESTED_QUESTIONS
        }, status=status.HTTP_200_OK)

    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response(
                {"error": "Message cannot be empty.", "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )

        history = request.data.get("history", [])
        if not isinstance(history, list):
            history = []

        current_page = request.data.get("current_page", "Dashboard")

        # Build real-time user context from DB
        user_context = get_user_live_context(request.user, current_page=current_page)

        result = ask_gemini_assistant(
            user_message=message,
            conversation_history=history,
            user_context=user_context
        )

        if result.get("success"):
            return Response({
                "success": True,
                "reply": result.get("reply"),
                "model": result.get("model"),
                "suggestions": SUGGESTED_QUESTIONS[:3]
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": False,
                "reply": result.get("reply", "An error occurred while generating a response."),
                "error": result.get("error")
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
