# Windows Tally Connector

This Windows application acts as a secure local bridge between TallyPrime (`localhost:9000`) and the cloud Django CRM API over HTTPS.

## Architecture

```
Client Windows PC
[TallyPrime :9000] <--(Local XML/HTTP)--> [Tally Connector] <--(HTTPS / Token Auth)--> [Django CRM API]
```

## How to Run & Pair

### 1. Pair with CRM
In the CRM, go to **Settings > Integrations > Tally** and click **Connect Tally** to generate a pairing code (e.g. `TALLY-7F82-91KD`).

Then run on your Windows PC:
```bash
python tally_connector.py --pair TALLY-7F82-91KD
```
Or simply run:
```bash
python tally_connector.py
```
and enter the pairing code when prompted.

### 2. Run Daemon Mode (Background Polling)
```bash
python tally_connector.py --daemon
```

### 3. Test with Mock Data (Without live TallyPrime)
If testing on a development machine without TallyPrime installed, use the `--mock` flag:
```bash
python tally_connector.py --mock --daemon
```
This simulates realistic Indian GST sales invoices (ABC Industries Pvt Ltd, XYZ Traders, etc.) complete with item-level breakdowns, HSN codes, and CGST/SGST/IGST tax rates.

### 4. Build Windows Standalone `.exe`
Run:
```cmd
build_exe.bat
```
The resulting `.exe` will be located in `connector\dist\TallyConnector.exe`.
