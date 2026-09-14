from django.urls import path
from .views import (
    TallyStatusView,
    GeneratePairingCodeView,
    SelectCompanyView,
    TriggerSyncNowView,
    TallyInvoiceListView,
    TallyInvoiceDetailView,
    TallySyncHistoryView,
    TallyDisconnectView,
    ConnectorPairView,
    ConnectorHeartbeatView,
    ConnectorUploadInvoicesView,
    DownloadConnectorView,
    ClearTestDataView,
)


urlpatterns = [
    # CRM Web App Endpoints (JWT Authenticated)
    path('status/', TallyStatusView.as_view(), name='tally-status'),
    path('pairing-code/', GeneratePairingCodeView.as_view(), name='tally-pairing-code'),
    path('select-company/', SelectCompanyView.as_view(), name='tally-select-company'),
    path('sync-now/', TriggerSyncNowView.as_view(), name='tally-sync-now'),
    path('invoices/', TallyInvoiceListView.as_view(), name='tally-invoices-list'),
    path('invoices/<int:pk>/', TallyInvoiceDetailView.as_view(), name='tally-invoice-detail'),
    path('sync-history/', TallySyncHistoryView.as_view(), name='tally-sync-history'),
    path('disconnect/', TallyDisconnectView.as_view(), name='tally-disconnect'),
    path('download-connector/', DownloadConnectorView.as_view(), name='tally-download-connector'),
    path('clear-test-data/', ClearTestDataView.as_view(), name='tally-clear-test-data'),

    # Windows Connector Endpoints
    path('connector/pair/', ConnectorPairView.as_view(), name='connector-pair'),
    path('connector/heartbeat/', ConnectorHeartbeatView.as_view(), name='connector-heartbeat'),
    path('connector/invoices/', ConnectorUploadInvoicesView.as_view(), name='connector-upload-invoices'),
]
