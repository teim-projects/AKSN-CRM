from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from .models import TallyIntegration, TallyInvoice, TallyInvoiceItem, TallySyncJob, TallySyncLog

User = get_user_model()


class TallyIntegrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='TestPassword123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_pairing_and_sync_lifecycle(self):
        # 1. CRM user requests pairing code
        resp = self.client.post('/api/tally/pairing-code/')
        self.assertEqual(resp.status_code, 200)
        pairing_code = resp.data['pairing_code']
        self.assertTrue(pairing_code.startswith('TALLY-'))

        # 2. Connector pairs with the pairing code (public endpoint)
        connector_client = APIClient()
        pair_resp = connector_client.post('/api/tally/connector/pair/', {
            'pairing_code': pairing_code,
            'connector_name': 'WIN-DEV-01',
            'connector_id': 'DEVICE-123'
        }, format='json')
        self.assertEqual(pair_resp.status_code, 200)
        auth_token = pair_resp.data['auth_token']
        self.assertTrue(bool(auth_token))

        # 3. Connector sends heartbeat
        connector_client.credentials(HTTP_X_TALLY_TOKEN=auth_token)
        hb_resp = connector_client.post('/api/tally/connector/heartbeat/', {
            'is_tally_online': True,
            'tally_version': 'TallyPrime 4.1',
            'companies': [{'name': 'ABC Industries Pvt Ltd', 'identifier': 'ABC-001'}],
            'current_company': 'ABC Industries Pvt Ltd',
            'company_identifier': 'ABC-001',
        }, format='json')
        self.assertEqual(hb_resp.status_code, 200)

        # Verify CRM status view shows connected
        crm_status_resp = self.client.get('/api/tally/status/')
        self.assertEqual(crm_status_resp.status_code, 200)
        self.assertEqual(crm_status_resp.data['status'], 'connected')
        self.assertEqual(crm_status_resp.data['tally_company_name'], 'ABC Industries Pvt Ltd')

        # 4. Connector uploads invoice batch
        invoice_batch = [
            {
                'tally_guid': 'GUID-INV-1001',
                'voucher_number': 'INV-1001',
                'voucher_type': 'Sales',
                'date': '2026-09-12',
                'party_name': 'ABC Industries Pvt Ltd',
                'party_ledger_id': 'LEDGER-01',
                'gstin': '27AABCA1234F1Z9',
                'state': 'Maharashtra',
                'subtotal': 10000.00,
                'cgst_amount': 900.00,
                'sgst_amount': 900.00,
                'total_tax': 1800.00,
                'total_amount': 11800.00,
                'items': [
                    {
                        'item_name': 'Test Filter',
                        'quantity': 2.0,
                        'rate': 5000.00,
                        'taxable_amount': 10000.00,
                        'cgst_amount': 900.00,
                        'sgst_amount': 900.00,
                        'total_amount': 11800.00,
                    }
                ]
            }
        ]
        upload_resp = connector_client.post('/api/tally/connector/invoices/', {
            'company_name': 'ABC Industries Pvt Ltd',
            'company_identifier': 'ABC-001',
            'invoices': invoice_batch
        }, format='json')
        self.assertEqual(upload_resp.status_code, 200)
        self.assertEqual(upload_resp.data['created'], 1)
        self.assertEqual(upload_resp.data['updated'], 0)

        # Verify DB counts
        self.assertEqual(TallyInvoice.objects.count(), 1)
        self.assertEqual(TallyInvoiceItem.objects.count(), 1)
        inv = TallyInvoice.objects.first()
        self.assertEqual(inv.voucher_number, 'INV-1001')
        self.assertEqual(inv.party_name, 'ABC Industries Pvt Ltd')
        self.assertEqual(float(inv.total_amount), 11800.00)

        # 5. DUPLICATE PREVENTION & UPDATE TEST:
        # Sync again with modified price (₹12,980 instead of ₹11,800)
        invoice_batch[0]['total_amount'] = 12980.00
        invoice_batch[0]['subtotal'] = 11000.00
        upload_resp2 = connector_client.post('/api/tally/connector/invoices/', {
            'company_name': 'ABC Industries Pvt Ltd',
            'company_identifier': 'ABC-001',
            'invoices': invoice_batch
        }, format='json')
        self.assertEqual(upload_resp2.status_code, 200)
        self.assertEqual(upload_resp2.data['created'], 0)
        self.assertEqual(upload_resp2.data['updated'], 1)

        # Verify invoice was updated without creating duplicate row
        self.assertEqual(TallyInvoice.objects.count(), 1)
        inv.refresh_from_db()
        self.assertEqual(float(inv.total_amount), 12980.00)

        # 6. Test CRM Invoice List and Detail APIs
        list_resp = self.client.get('/api/tally/invoices/')
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(list_resp.data['count'], 1)

        detail_resp = self.client.get(f'/api/tally/invoices/{inv.id}/')
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(len(detail_resp.data['items']), 1)
        self.assertEqual(detail_resp.data['items'][0]['item_name'], 'Test Filter')

        # 7. Test Sync History API
        history_resp = self.client.get('/api/tally/sync-history/')
        self.assertEqual(history_resp.status_code, 200)
        self.assertEqual(history_resp.data['count'], 2)  # Two uploads

        # 8. Test Manual Sync Trigger
        sync_trigger_resp = self.client.post('/api/tally/sync-now/')
        self.assertEqual(sync_trigger_resp.status_code, 200)
        self.assertTrue('job_id' in sync_trigger_resp.data)
        self.assertEqual(TallySyncJob.objects.filter(status='pending').count(), 1)

        # Next heartbeat from connector should pick up the job
        hb_resp2 = connector_client.post('/api/tally/connector/heartbeat/', {
            'is_tally_online': True,
        }, format='json')
        self.assertEqual(hb_resp2.status_code, 200)
        self.assertIsNotNone(hb_resp2.data.get('pending_job'))
