from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import TallyIntegration


class TallyConnectorAuthentication(BaseAuthentication):
    """
    Custom authentication for the Windows Tally Connector.
    Checks for `X-Tally-Token: <token>` header or `Authorization: Token/Bearer <token>`.
    """
    def authenticate(self, request):
        token = request.headers.get('X-Tally-Token')
        if not token:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer ') or auth_header.startswith('Token '):
                parts = auth_header.split(' ', 1)
                if len(parts) == 2:
                    token = parts[1].strip()

        if not token:
            return None  # Pass to next authentication class or fail permission

        try:
            integration = TallyIntegration.objects.get(auth_token=token)
        except TallyIntegration.DoesNotExist:
            raise AuthenticationFailed('Invalid Tally connector token.')

        # Attach integration to request
        request.tally_integration = integration
        user = integration.created_by
        return (user, token)
