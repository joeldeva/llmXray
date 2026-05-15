# Changelog

## Unreleased

- Renamed legacy product surfaces to LlmXray.
- Added API key generation, listing, revocation, hashed storage, and mandatory `x-api-key` authentication for scan routes.
- Added per-API-key sliding-window scan rate limits with `Retry-After` and usage metadata on scan responses.
- Added multipart file scanning for TXT, CSV, PDF, DOCX, and XLSX uploads with dangerous file type blocking and 10MB upload limits.
- Added API-key protected paginated audit logs and dashboard stats with masked findings, policy summaries, and seven-day risk trends.
- Added usage and billing tracking with monthly plan limits, masked key summaries, reset dates, and free-tier 402 enforcement.
