# LlmXray API Integration in 5 Minutes

Use LlmXray as a security gateway in front of any AI feature: chat, document analysis, copilots, agents, internal tools, or direct model API calls.

## Base URL

```text
https://backend-gamma-livid-54.vercel.app
```

Health check:

```bash
curl https://backend-gamma-livid-54.vercel.app/api/health
```

Set your API key:

```bash
export LLMXRAY_API_KEY="llmxray_live_your_key_here"
```

## 1. Scan Text Before Sending It to an AI Provider

Call `POST /api/scan/prompt` before your product sends user, agent, or application text to an AI model.

```bash
curl -X POST https://backend-gamma-livid-54.vercel.app/api/scan/prompt \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $LLMXRAY_API_KEY" \
  -H "X-LlmXray-Tenant-Id: demo-company" \
  -H "X-LlmXray-Client-Id: web-app" \
  -H "X-LlmXray-Subject-Id: user@example.com" \
  -d '{"prompt":"Here is my API key: sk-EXAMPLE-REDACTED","site":"my-product"}'
```

JavaScript:

```js
const response = await fetch('https://backend-gamma-livid-54.vercel.app/api/scan/prompt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.LLMXRAY_API_KEY,
    'X-LlmXray-Tenant-Id': 'demo-company',
    'X-LlmXray-Client-Id': 'web-app',
    'X-LlmXray-Subject-Id': currentUser.email,
  },
  body: JSON.stringify({
    prompt: userInput,
    site: 'my-product',
  }),
});

const scan = await response.json();
```

## 2. Enforce the Decision

LlmXray returns one of `ALLOW`, `WARN`, `MASK`, `BLOCK`, `HUMAN_REVIEW`, or `QUARANTINE`.

```js
if (scan.decision === 'BLOCK' || scan.decision === 'QUARANTINE') {
  throw new Error(scan.message);
}

if (scan.decision === 'HUMAN_REVIEW') {
  await queueForReview(scan.eventId);
  return;
}

const safePrompt = scan.maskedPrompt || userInput;
```

Example response:

```json
{
  "decision": "BLOCK",
  "riskScore": 90,
  "riskLevel": "CRITICAL",
  "policyHits": ["POL_SECRET_BLOCK"],
  "message": "LlmXray blocked this prompt.",
  "findings": [
    { "category": "secrets", "label": "OpenAI API Key", "value": null }
  ],
  "usage": {
    "requestsThisMinute": 12,
    "requestsToday": 340,
    "dailyLimit": 10000
  }
}
```

## 3. Scan Uploaded Files

Call `POST /api/scan/file` with multipart form data when your app accepts uploads.

```bash
curl -X POST https://backend-gamma-livid-54.vercel.app/api/scan/file \
  -H "X-Api-Key: $LLMXRAY_API_KEY" \
  -F "file=@notes.txt" \
  -F "site=my-product"
```

Supported extraction: PDF, DOCX, CSV, TXT, and XLSX. Dangerous key/certificate file types are blocked before scanning.

## 4. Read Audit and Usage Data

```bash
curl https://backend-gamma-livid-54.vercel.app/api/audit/logs \
  -H "X-Api-Key: $LLMXRAY_API_KEY"

curl https://backend-gamma-livid-54.vercel.app/api/usage \
  -H "X-Api-Key: $LLMXRAY_API_KEY"
```

Audit logs store masked findings and metadata only. Raw prompts and raw file contents are not stored.

## Production Notes

For customer production, configure persistent `DATABASE_URL`, set `LLMXRAY_MASTER_API_KEY` as the bootstrap secret, generate `llmxray_live_*` API keys per org, and restrict `ALLOWED_ORIGINS` to your product domains.
