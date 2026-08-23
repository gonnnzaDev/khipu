
## 📄 3. `docs/SECURITY.md`

```markdown
# 🛡️ Security & Threat Model

## Design Principles

1. **Privacy-first**: All inference runs locally. No invoice data ever leaves the user's machine.
2. **Fail-closed**: When in doubt, the system refuses to act rather than guessing.
3. **Auditability**: Every validation creates a full evidence trail under `runs/{run_id}/`.

## Threat Model

### Threat 1: Malicious Supplier (Fake Invoice)
- **Attack**: Supplier submits an invoice with inflated amounts or fabricated items.
- **Mitigation**: 
  - `price_match` check validates unit prices against PO with 1% tolerance.
  - `subtotal_math` verifies arithmetic integrity.
  - `supplier_match` confirms RUC matches PO's authorized supplier.
- **Result**: 🔴 BLOCK with specific discrepancy.

### Threat 2: Duplicate Payment
- **Attack**: Same invoice submitted twice.
- **Mitigation**: `duplicate_invoice` check hashes `(supplier_ruc, invoice_number)` against previous runs.
- **Result**: 🔴 BLOCK on second submission.

### Threat 3: Delivery/Invoice Mismatch (Ghost Shipment)
- **Attack**: Invoice claims goods that were never delivered.
- **Mitigation**: `delivery_match` compares invoiced quantities against delivery guide quantities.
- **Result**: 🔴 BLOCK when guide quantities don't cover invoiced quantities.

### Threat 4: OCR/QVAC Hallucination
- **Attack**: AI model invents plausible-looking data when image is poor quality.
- **Mitigation**:
  - QVAC runs with structured JSON output format (constrained decoding).
  - 3-retry loop on JSON parse failures.
  - Ground-truth fallback only for known invoices, clearly marked.
  - If both QVAC and fallback fail → **hard 422 error**, never a fabricated response.
- **Result**: System prefers "I don't know" over a plausible lie.

### Threat 5: Web3 Transaction Tampering
- **Attack**: Attacker manipulates recipient wallet or amount.
- **Mitigation**:
  - `/pay` endpoint builds the transaction payload server-side using validated invoice data.
  - `confirm: false` for preview mode (no signature required).
  - User signs the exact payload shown in MetaMask — no hidden parameters.
  - Amount comes from validated `invoice.total`, not user input.

### Threat 6: Data Leakage
- **Attack**: Invoice data exfiltrated to cloud services.
- **Mitigation**:
  - QVAC runs 100% on-device (no API calls to external services).
  - No telemetry, no analytics, no cloud sync.
  - All data stored locally under `runs/`.

## Compliance Notes

- **GDPR/LPDP (Peru)**: Data never leaves user's device.
- **Financial audit**: Full evidence trail per run in `runs/{id}/`.
- **Open source**: All logic auditable in the repository.

## Known Limitations

- The fallback ground-truth contains only 9 curated invoices. Production deployment requires QVAC to load correctly (Linux recommended) or a persistent invoice database.
- Web3 payments currently use Sepolia testnet. Mainnet deployment requires additional review of gas estimation and slippage.
