# Changelog

## Unreleased

- Renamed legacy product surfaces to LlmXray.
- Added API key generation, listing, revocation, hashed storage, and mandatory `x-api-key` authentication for scan routes.
- Added per-API-key sliding-window scan rate limits with `Retry-After` and usage metadata on scan responses.
- Added multipart file scanning for TXT, CSV, PDF, DOCX, and XLSX uploads with dangerous file type blocking and 10MB upload limits.
- Added API-key protected paginated audit logs and dashboard stats with masked findings, policy summaries, and seven-day risk trends.
- Added usage and billing tracking with monthly plan limits, masked key summaries, reset dates, and free-tier 402 enforcement.
- Wired `/api/scan/file` to the production file scanner so file-specific filename, metadata, and content rules are enforced.
- Moved API key usage accounting to Postgres in production with JSON storage kept only as a local development fallback.
- Moved auth login rate limiting to Postgres in production with the in-memory limiter kept only as a local fallback.
- Removed local backend JSON data stores from git tracking and ignored `backend/src/data/` for development-only state.
- Restricted API key generation to the bootstrap master key.
- Removed the API-key-based CORS bypass so configured origin allowlists are enforced consistently.
- Corrected scanner severity weights so critical findings outrank high, medium, and low findings.
- Tightened UPI ID detection to known UPI handles so email addresses are not double-counted as UPI IDs.
- Removed the duplicate Indian phone-number PII detector.
- Pushed audit log filtering and stats aggregation into Postgres for complete paginated results beyond the old 1000-row load window.
- Removed duplicate `audit_logs` schema column migrations that were already covered by table creation.
- Moved honeypot sample data into `backend/test/fixtures/`.
- Added a backend Docker ignore file to keep local data, environment files, logs, and dependencies out of images.
