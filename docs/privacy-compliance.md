# Privacy and Compliance Notes

LlmXray is designed to minimize sensitive data retention.

## Data Collected

- User ID supplied by the integrating application.
- Tenant ID.
- Client ID.
- Site/domain.
- Scan decision.
- Policy hits.
- Masked evidence.
- File metadata for scanned uploads.
- Audit timestamps and hash-chain metadata.

## Data Not Stored By Default

- Raw prompts.
- Full API keys.
- Full file contents.
- AI provider responses.

## Retention

Set:

```text
AUDIT_RETENTION_DAYS=365
```

Run:

```bash
npm run retention
```

## Compliance Readiness

This codebase supports audit evidence, role separation, device inventory, and tamper-evident logs. External compliance still requires:

- Written security policies.
- Access review process.
- Incident response procedure.
- DPA / privacy policy review.
- Penetration test.
- SOC 2 / ISO 27001 evidence collection.
