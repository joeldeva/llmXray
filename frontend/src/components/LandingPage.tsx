import { useEffect, useState } from 'react'
import {
  Shield,
  ChevronRight,
  Lock,
  AlertTriangle,
  FileText,
  Database,
  Activity,
  CheckCircle,
  Settings,
  Monitor,
  Eye,
  Zap,
} from 'lucide-react'
import { GatewayScene } from './GatewayScene'

const BACKEND = 'https://backend-gamma-livid-54.vercel.app/api'

// ── Live status chip ──────────────────────────────────────────────────────────

function LiveStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${BACKEND}/health`, { signal: controller.signal })
      .then(r => r.json())
      .then((d: { status: string }) =>
        setStatus(d.status === 'ok' ? 'online' : 'offline'),
      )
      .catch(() => {
        if (!controller.signal.aborted) setStatus('offline')
      })
    return () => controller.abort()
  }, [])

  return (
    <span className={`lp-status-chip lp-status-${status}`}>
      <span className={`lp-dot lp-dot-${status === 'online' ? 'pulse' : status === 'checking' ? 'amber' : 'red'}`} />
      {status === 'online' ? 'API Online' : status === 'checking' ? 'Connecting...' : 'API Offline'}
    </span>
  )
}

// ── Code block ────────────────────────────────────────────────────────────────

const REQUEST_EXAMPLE = `POST /api/scan/prompt
Content-Type: application/json
x-api-key: llmxray_live_[redacted]

{
  "prompt": "Here is my API key: sk-proj-abc...",
  "userId": "user_001",
  "department": "engineering",
  "site": "chat-app"
}`

const RESPONSE_EXAMPLE = `{
  "decision": "BLOCK",
  "riskScore": 92,
  "riskLevel": "CRITICAL",
  "policyHits": ["POL_SECRET_BLOCK"],
  "findings": [
    {
      "type": "secret",
      "subtype": "openai_api_key",
      "severity": "CRITICAL",
      "masked": "sk-proj-[REDACTED]"
    }
  ],
  "usage": {
    "requestsToday": 47,
    "remainingToday": 953
  },
  "eventId": "evt_4abc02df1d47",
  "timestamp": "2025-05-15T12:34:56.789Z"
}`

// ── Main component ────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="lp-shell">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="lp-nav">
        <a className="lp-brand" href="/">
          <Shield size={20} />
          <span>LlmXray</span>
        </a>
        <nav className="lp-nav-links">
          <a href="#gateway">Gateway</a>
          <a href="#coverage">Coverage</a>
          <a href="#api">API</a>
          <a href="#audit">Audit</a>
          <a href="/admin" className="lp-nav-admin">Admin</a>
        </nav>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <LiveStatus />
          <h1 className="lp-h1">LlmXray</h1>
          <p className="lp-hero-sub">
            AI API Gateway and DLP scanner for enterprises. Every prompt and uploaded file
            is inspected before it reaches an AI model — detecting secrets, PII, prompt
            injection, and risky financial or HR data. Enforces policies, rate limits
            requests, and writes masked audit logs to Postgres.
          </p>
          <div className="lp-hero-actions">
            <a href="#api" className="lp-btn-primary">
              Start API integration <ChevronRight size={16} />
            </a>
            <a href="/admin" className="lp-btn-secondary">
              Open admin dashboard
            </a>
          </div>
          <div className="lp-hero-tags">
            <span>POST /api/scan/prompt</span>
            <span>POST /api/scan/file</span>
            <span>Neon Postgres</span>
            <span>Audit trail</span>
          </div>
        </div>

        <div className="lp-hero-3d" aria-hidden="true">
          <GatewayScene />
          <div className="lp-scene-legend">
            <span className="lp-legend-item lp-legend-cyan">Incoming</span>
            <span className="lp-legend-item lp-legend-green">ALLOW</span>
            <span className="lp-legend-item lp-legend-yellow">WARN</span>
            <span className="lp-legend-item lp-legend-red">BLOCK</span>
          </div>
        </div>
      </section>

      {/* ── Scan Flow ────────────────────────────────────────────────── */}
      <section className="lp-section lp-section-flow" id="gateway">
        <div className="lp-section-head">
          <h2>Scan pipeline</h2>
          <p>
            Every request passes through the LlmXray gateway before reaching your AI
            provider. Policy decisions happen in milliseconds.
          </p>
        </div>

        <div className="lp-pipeline">
          <div className="lp-pipe-node">
            <div className="lp-pipe-label">Your App</div>
            <div className="lp-pipe-sub">Client SDK</div>
          </div>
          <div className="lp-pipe-connector" />
          <div className="lp-pipe-node lp-pipe-node--active">
            <div className="lp-pipe-label">LlmXray Gateway</div>
            <div className="lp-pipe-sub">Auth · Rate limit</div>
          </div>
          <div className="lp-pipe-connector" />
          <div className="lp-pipe-node lp-pipe-node--active">
            <div className="lp-pipe-label">Scanner</div>
            <div className="lp-pipe-sub">20+ detectors</div>
          </div>
          <div className="lp-pipe-connector" />
          <div className="lp-pipe-node lp-pipe-node--active">
            <div className="lp-pipe-label">Policy Engine</div>
            <div className="lp-pipe-sub">Evaluate rules</div>
          </div>
          <div className="lp-pipe-connector" />
          <div className="lp-pipe-node">
            <div className="lp-pipe-label">AI Model</div>
            <div className="lp-pipe-sub">OpenAI · Anthropic</div>
          </div>
        </div>

        <div className="lp-decisions">
          {[
            {
              d: 'ALLOW',
              cls: 'green',
              desc: 'Request is clean — forwarded to AI provider without modification.',
            },
            {
              d: 'WARN',
              cls: 'yellow',
              desc: 'Low-risk PII detected — user sees a warning and can proceed.',
            },
            {
              d: 'BLOCK',
              cls: 'red',
              desc: 'Secret, API key, or injection attempt detected — request terminated.',
            },
            {
              d: 'HUMAN_REVIEW',
              cls: 'amber',
              desc: 'Ambiguous risk — queued for manual review before any action.',
            },
          ].map(({ d, cls, desc }) => (
            <div key={d} className={`lp-decision-card lp-decision-card--${cls}`}>
              <span className={`lp-badge lp-badge-${cls}`}>{d}</span>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Detection Coverage ───────────────────────────────────────── */}
      <section className="lp-section lp-section-alt" id="coverage">
        <div className="lp-section-head">
          <h2>Detection coverage</h2>
          <p>
            Specialized detectors for secrets, PII, prompt injection attacks, and
            file-embedded sensitive data.
          </p>
        </div>

        <div className="lp-coverage-grid">
          <div className="lp-cover-card">
            <Lock size={18} />
            <h3>Secrets</h3>
            <ul>
              <li>OpenAI API keys</li>
              <li>AWS credentials</li>
              <li>GitHub PATs</li>
              <li>Slack tokens</li>
              <li>Stripe secret keys</li>
              <li>JWT tokens</li>
              <li>Private keys (RSA / EC)</li>
              <li>Razorpay keys</li>
            </ul>
          </div>

          <div className="lp-cover-card">
            <Eye size={18} />
            <h3>PII</h3>
            <ul>
              <li>Aadhaar numbers</li>
              <li>PAN cards</li>
              <li>Email addresses</li>
              <li>Phone numbers</li>
              <li>Credit card numbers</li>
              <li>US Social Security Numbers</li>
              <li>Passport numbers</li>
              <li>Financial data markers</li>
            </ul>
          </div>

          <div className="lp-cover-card">
            <Zap size={18} />
            <h3>Prompt injection</h3>
            <ul>
              <li>Instruction override</li>
              <li>Jailbreak patterns</li>
              <li>Role hijacking</li>
              <li>System prompt exfiltration</li>
              <li>Indirect injection</li>
              <li>DAN / persona bypass</li>
            </ul>
          </div>

          <div className="lp-cover-card">
            <FileText size={18} />
            <h3>File scanning</h3>
            <ul>
              <li>PDF documents</li>
              <li>DOCX files</li>
              <li>CSV data exports</li>
              <li>TXT plaintext</li>
              <li>XLSX spreadsheets</li>
              <li>Dangerous file-type blocking</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── API Section ──────────────────────────────────────────────── */}
      <section className="lp-section" id="api">
        <div className="lp-section-head">
          <h2>One API call to scan everything</h2>
          <p>
            Point your application at the LlmXray gateway. Receive a structured decision
            on every request — enforced by your policy configuration.
          </p>
        </div>

        <div className="lp-api-grid">
          <div>
            <div className="lp-code-label">Request</div>
            <div className="lp-code-wrap">
              <pre className="lp-code"><code>{REQUEST_EXAMPLE}</code></pre>
            </div>
          </div>
          <div>
            <div className="lp-code-label">Response</div>
            <div className="lp-code-wrap">
              <pre className="lp-code"><code>{RESPONSE_EXAMPLE}</code></pre>
            </div>
          </div>
        </div>

        <div className="lp-api-features">
          {[
            {
              icon: <CheckCircle size={16} />,
              title: 'Structured decision',
              body: 'Always returns decision, riskScore, riskLevel, policyHits, and masked findings.',
            },
            {
              icon: <Activity size={16} />,
              title: 'Usage tracking',
              body: 'Per-API-key daily request counts with configurable rate limits per client.',
            },
            {
              icon: <Database size={16} />,
              title: 'Audit trail',
              body: 'Every scan writes a tamper-evident log entry to Neon Postgres with SHA-256 hash chain.',
            },
            {
              icon: <FileText size={16} />,
              title: 'File scan endpoint',
              body: 'POST /api/scan/file accepts multipart uploads — scans PDF, DOCX, CSV, XLSX content.',
            },
          ].map(f => (
            <div key={f.title} className="lp-feature-row">
              <span className="lp-feature-icon">{f.icon}</span>
              <div>
                <strong>{f.title}</strong>
                <span>{f.body}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Audit / Compliance ───────────────────────────────────────── */}
      <section className="lp-section lp-section-alt" id="audit">
        <div className="lp-section-head">
          <h2>Audit-ready from day one</h2>
          <p>
            Built for enterprises that need evidence of AI governance without storing raw
            prompt content.
          </p>
        </div>

        <div className="lp-audit-grid">
          {[
            {
              icon: <Lock size={20} />,
              title: 'No raw prompts stored',
              body: 'Only masked findings and metadata are persisted. Sensitive tokens are redacted before any write.',
            },
            {
              icon: <Database size={20} />,
              title: 'Neon Postgres audit trail',
              body: 'Paginated audit log with SHA-256 hash chain. Every event links cryptographically to the previous — tamper-evident by design.',
            },
            {
              icon: <Activity size={20} />,
              title: 'Dashboard analytics',
              body: 'Real-time stats: total scans, blocked count, risk distribution, top policy violations, decision breakdown.',
            },
            {
              icon: <CheckCircle size={20} />,
              title: 'Human review queue',
              body: 'HUMAN_REVIEW decisions queue for manual approval or rejection. Each action is logged with reviewer note.',
            },
            {
              icon: <Settings size={20} />,
              title: 'Policy management',
              body: 'Toggle policies on or off and change actions (ALLOW / WARN / BLOCK / QUARANTINE) without redeploying.',
            },
            {
              icon: <Monitor size={20} />,
              title: 'API client control',
              body: 'Inventory every registered API client. Suspend or revoke keys instantly from the admin panel.',
            },
          ].map(a => (
            <div key={a.title} className="lp-audit-card">
              <span className="lp-audit-icon">{a.icon}</span>
              <div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <AlertTriangle size={28} className="lp-cta-icon" aria-hidden="true" />
        <h2>Protect your AI stack</h2>
        <p>
          Connect the gateway API, configure policies, and get full visibility into AI
          usage across your organization.
        </p>
        <div className="lp-cta-actions">
          <a href="/admin" className="lp-btn-primary">
            Open admin dashboard <ChevronRight size={16} />
          </a>
          <a
            href={`${BACKEND}/health`}
            target="_blank"
            rel="noreferrer"
            className="lp-btn-secondary"
          >
            Check API health
          </a>
        </div>
      </section>

      <footer className="lp-footer">
        <span>LlmXray — AI API Gateway &amp; DLP Scanner</span>
        <span>backend-gamma-livid-54.vercel.app</span>
      </footer>
    </div>
  )
}
