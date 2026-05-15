import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, Activity, AlertTriangle, CheckCircle, Clock, FileText, Download, Settings, Lock, FileCheck, CheckSquare, RefreshCw, X, ChevronRight, LogOut, Monitor } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import './index.css';
import { LandingPage } from './components/LandingPage';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

type Stats = {
  total: number;
  blocked: number;
  warned: number;
  humanReview: number;
  quarantined: number;
  critical: number;
  fileScans: number;
  topPolicyHits?: Array<{ name: string; value: number }>;
};

type BackendHealth = {
  status: 'checking' | 'online' | 'offline';
  service?: string;
  checkedAt?: string;
};

type AuditLog = {
  id: string;
  timestamp: string;
  userId: string;
  department: string;
  eventType: string;
  riskLevel: string;
  riskScore: number;
  decision: string;
  policyHits?: string[];
  evidence?: string;
  fileMeta?: { name: string };
  entryHash?: string;
};

type AuditLogsResponse = {
  events: AuditLog[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type AuditIntegrity = {
  valid: boolean;
  checked: number;
  headHash: string | null;
  errors: Array<{ id: string; reason: string }>;
};

type Policy = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  action: string;
};

type ReviewItem = {
  id: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerNote?: string | null;
  userId: string;
  department: string;
  eventType: string;
  decision: string;
  riskLevel?: string;
  policyHits?: string[];
  evidence?: string;
};

type Device = {
  tenantId: string;
  deviceId: string;
  userId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  clientVersion?: string | null;
  firstSeen: string;
  lastSeen: string;
};

type AuthSession = {
  token: string;
  user: { email: string; role: string; permissions: string[] };
  usingDefaultCredentials?: boolean;
};

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = { CRITICAL: 'badge deny', HIGH: 'badge quarantine', MEDIUM: 'badge warn', LOW: 'badge allow' };
  return <span className={map[level] || 'badge allow'}>{level}</span>;
}

function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, string> = { BLOCK: 'badge deny', QUARANTINE: 'badge quarantine', HUMAN_REVIEW: 'badge warn', WARN: 'badge warn', ALLOW: 'badge allow', MASK: 'badge allow' };
  return <span className={map[decision] || 'badge allow'}>{decision}</span>;
}

function AdminPortal() {
  const [tab, setTab] = useState('dashboard');
  const [token, setToken] = useState(() => localStorage.getItem('lx_admin_token') || '');
  const [apiKey] = useState(() => localStorage.getItem('lx_api_key') || import.meta.env.VITE_LLMXRAY_API_KEY || '');
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem('lx_admin_email') || '');
  const [adminRole, setAdminRole] = useState(() => localStorage.getItem('lx_admin_role') || '');
  const [permissions, setPermissions] = useState<string[]>(() => JSON.parse(localStorage.getItem('lx_admin_permissions') || '[]'));
  const [loginEmail, setLoginEmail] = useState(adminEmail || 'admin@llmxray.local');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authWarning, setAuthWarning] = useState('');
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({ status: 'checking' });
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [integrity, setIntegrity] = useState<AuditIntegrity | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedReview, setSelectedReview] = useState<string | null>(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
  }), [apiKey, token]);

  const clearSession = useCallback(() => {
    localStorage.removeItem('lx_admin_token');
    localStorage.removeItem('lx_admin_email');
    localStorage.removeItem('lx_admin_role');
    localStorage.removeItem('lx_admin_permissions');
    setToken('');
    setAdminEmail('');
    setAdminRole('');
    setPermissions([]);
    setStats(null);
    setLogs([]);
    setPolicies([]);
    setReviewQueue([]);
    setDevices([]);
    setIntegrity(null);
  }, []);

  const can = useCallback((permission: string) => permissions.includes(permission), [permissions]);

  const checkBackendHealth = useCallback(async () => {
    try {
      const response = await axios.get<{ status: string; service: string }>(`${API}/health`, { timeout: 3000 });
      setBackendHealth({
        status: response.data.status === 'ok' ? 'online' : 'offline',
        service: response.data.service,
        checkedAt: new Date().toISOString(),
      });
    } catch {
      setBackendHealth({ status: 'offline', checkedAt: new Date().toISOString() });
    }
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const [s, l, p, r, d] = await Promise.all([
        axios.get<Stats>(`${API}/audit/stats`, { headers: authHeaders() }),
        axios.get<AuditLogsResponse | AuditLog[]>(`${API}/audit/logs`, { headers: authHeaders() }),
        can('policy:read') ? axios.get<Policy[]>(`${API}/policies`, { headers: authHeaders() }) : Promise.resolve({ data: [] as Policy[] }),
        can('review:read') ? axios.get<ReviewItem[]>(`${API}/review`, { headers: authHeaders() }) : Promise.resolve({ data: [] as ReviewItem[] }),
        can('device:read') ? axios.get<Device[]>(`${API}/devices`, { headers: authHeaders() }) : Promise.resolve({ data: [] as Device[] }),
      ]);
      setStats(s.data);
      setLogs(Array.isArray(l.data) ? l.data : l.data.events);
      setPolicies(p.data);
      setReviewQueue(r.data);
      setDevices(d.data);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        clearSession();
      }
      console.error('Failed to fetch data', e);
    }
  }, [authHeaders, can, clearSession, token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      void checkBackendHealth();
      void fetchAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkBackendHealth, fetchAll, token]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');
    setAuthWarning('');

    try {
      const response = await axios.post<AuthSession>(`${API}/auth/login`, {
        email: loginEmail,
        password: loginPassword,
      });
      localStorage.setItem('lx_admin_token', response.data.token);
      localStorage.setItem('lx_admin_email', response.data.user.email);
      localStorage.setItem('lx_admin_role', response.data.user.role);
      localStorage.setItem('lx_admin_permissions', JSON.stringify(response.data.user.permissions || []));
      setToken(response.data.token);
      setAdminEmail(response.data.user.email);
      setAdminRole(response.data.user.role);
      setPermissions(response.data.user.permissions || []);
      setLoginPassword('');
      void checkBackendHealth();
      if (response.data.usingDefaultCredentials) {
        setAuthWarning('Development credentials are active. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and JWT_SECRET before production.');
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        setAuthError('Invalid email or password.');
      } else {
        setAuthError('Could not reach LlmXray backend.');
      }
    }
  };

  const togglePolicy = async (policy: Policy) => {
    if (!can('policy:write')) return;
    await axios.put(`${API}/policies/${policy.id}`, { ...policy, enabled: !policy.enabled }, { headers: authHeaders() });
    fetchAll();
  };

  const changeAction = async (policy: Policy, action: string) => {
    if (!can('policy:write')) return;
    await axios.put(`${API}/policies/${policy.id}`, { ...policy, action }, { headers: authHeaders() });
    fetchAll();
  };

  const handleApprove = async (id: string) => {
    if (!can('review:write')) return;
    await axios.post(`${API}/review/${id}/approve`, { note: reviewNote }, { headers: authHeaders() });
    setSelectedReview(null);
    setReviewNote('');
    fetchAll();
  };

  const handleReject = async (id: string) => {
    if (!can('review:write')) return;
    await axios.post(`${API}/review/${id}/reject`, { note: reviewNote }, { headers: authHeaders() });
    setSelectedReview(null);
    setReviewNote('');
    fetchAll();
  };

  const verifyAudit = async () => {
    if (!can('audit:verify')) return;
    const response = await axios.get<AuditIntegrity>(`${API}/audit/verify`, { headers: authHeaders() });
    setIntegrity(response.data);
  };

  const updateDeviceStatus = async (device: Device, status: Device['status']) => {
    if (!can('device:write')) return;
    await axios.patch(`${API}/devices/${encodeURIComponent(device.tenantId)}/${encodeURIComponent(device.deviceId)}`, { status }, { headers: authHeaders() });
    fetchAll();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={16} /> },
    { id: 'audit', label: 'Audit Logs', icon: <FileCheck size={16} /> },
    ...(can('policy:read') ? [{ id: 'policies', label: 'Policies', icon: <Settings size={16} /> }] : []),
    ...(can('review:read') ? [{ id: 'review', label: `Review Queue ${reviewQueue.filter(r => r.status === 'PENDING').length > 0 ? `(${reviewQueue.filter(r => r.status === 'PENDING').length})` : ''}`, icon: <Clock size={16} /> }] : []),
    ...(can('device:read') ? [{ id: 'devices', label: 'API Clients', icon: <Monitor size={16} /> }] : []),
  ];

  if (!token) {
    return (
      <div className="login-shell">
        <form className="login-panel" onSubmit={handleLogin}>
          <div className="login-brand">
            <Shield size={32} color="#3b82f6" />
            <div>
              <div className="brand-name">LlmXray</div>
              <div className="brand-sub">Admin Portal</div>
            </div>
          </div>
          <label className="field-label" htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            className="text-field"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            autoComplete="username"
          />
          <label className="field-label" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            className="text-field"
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            autoComplete="current-password"
          />
          {authError && <div className="auth-error">{authError}</div>}
          {authWarning && <div className="auth-warning">{authWarning}</div>}
          <button className="btn btn-primary" type="submit">Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Shield size={28} color="#3b82f6" />
          <div>
            <div className="brand-name">LlmXray</div>
            <div className="brand-sub">Admin Portal</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="proxy-status">
            <span className={backendHealth.status === 'online' ? 'dot-green' : 'dot-red'}></span>
            Backend {backendHealth.status === 'online' ? 'Online' : backendHealth.status === 'checking' ? 'Checking' : 'Offline'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>LlmXray v1.0.0</div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <h1 className="page-title">
            {tab === 'dashboard' && 'Security Dashboard'}
            {tab === 'audit' && 'Audit Logs'}
            {tab === 'policies' && 'Policy Management'}
            {tab === 'review' && 'Human Review Queue'}
            {tab === 'devices' && 'API Clients'}
          </h1>
          <div className="topbar-actions">
            <span className="admin-chip">{adminEmail} · {adminRole || 'user'}</span>
            <button className="btn-icon" onClick={() => { void checkBackendHealth(); void fetchAll(); }} title="Refresh"><RefreshCw size={16} /></button>
            <button className="btn-icon" onClick={clearSession} title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && (
          <div className="fade-in">
            <div className="metrics-grid">
              {[
                { label: 'Total Scans', value: stats.total, color: '#3b82f6', icon: <Activity size={20} /> },
                { label: 'Blocked', value: stats.blocked, color: '#ef4444', icon: <ShieldAlert size={20} /> },
                { label: 'Human Review', value: stats.humanReview, color: '#f59e0b', icon: <Clock size={20} /> },
                { label: 'Quarantined', value: stats.quarantined, color: '#8b5cf6', icon: <Lock size={20} /> },
                { label: 'File Scans', value: stats.fileScans, color: '#06b6d4', icon: <FileText size={20} /> },
                { label: 'Critical Events', value: stats.critical, color: '#ef4444', icon: <AlertTriangle size={20} /> },
              ].map(m => (
                <div key={m.label} className="metric-card glass-panel">
                  <div className="metric-icon" style={{ color: m.color }}>{m.icon}</div>
                  <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="dashboard-grid">
              <div className="glass-panel chart-card">
                <h2 className="card-title">Top Policy Violations</h2>
                {(stats.topPolicyHits?.length ?? 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.topPolicyHits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: '#475569', textAlign: 'center', padding: '2rem 0' }}>No violations yet.</p>}
              </div>

              <div className="glass-panel chart-card">
                <h2 className="card-title">Decision Distribution</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Blocked', value: stats.blocked },
                      { name: 'Warned', value: stats.warned },
                      { name: 'Review', value: stats.humanReview },
                      { name: 'Quarantine', value: stats.quarantined },
                    ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={3}>
                      {['#ef4444', '#f97316', '#f59e0b', '#8b5cf6'].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
              <h2 className="card-title">Recent Events</h2>
              <table className="logs-table">
                <thead><tr><th>Time</th><th>User</th><th>Type</th><th>Risk</th><th>Decision</th><th>Policy</th></tr></thead>
                <tbody>
                  {logs.slice(0, 5).map(log => (
                    <tr key={log.id}>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td><div style={{ fontWeight: 500 }}>{log.userId}</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.department}</div></td>
                      <td style={{ fontSize: '0.8rem' }}>{log.eventType}</td>
                      <td><RiskBadge level={log.riskLevel} /></td>
                      <td><DecisionBadge decision={log.decision} /></td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{(log.policyHits || []).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AUDIT LOGS ── */}
        {tab === 'audit' && (
          <div className="glass-panel fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Tamper-Proof Audit Trail</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={verifyAudit}>Verify Chain</button>
                <button className="btn-secondary"><Download size={14} style={{ display: 'inline', marginRight: '6px' }} />Export Logs</button>
              </div>
            </div>
            {integrity && (
              <div className={`integrity-box ${integrity.valid ? 'integrity-ok' : 'integrity-fail'}`}>
                Audit chain {integrity.valid ? 'valid' : 'failed'} · checked {integrity.checked} events · head {integrity.headHash || 'none'}
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead><tr><th>Time</th><th>User / Dept</th><th>Event</th><th>Risk</th><th>Decision</th><th>Policy Hit</th><th>Evidence</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td><div>{log.userId}</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.department}</div></td>
                      <td style={{ fontSize: '0.8rem' }}>{log.eventType}{log.fileMeta && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{log.fileMeta.name}</div>}</td>
                      <td><RiskBadge level={log.riskLevel} /><div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{log.riskScore}</div></td>
                      <td><DecisionBadge decision={log.decision} /></td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '150px' }}>{(log.policyHits || []).join(', ') || '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '220px', wordBreak: 'break-word' }}>{log.evidence || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── POLICIES ── */}
        {tab === 'policies' && (
          <div className="fade-in">
            <div className="glass-panel" style={{ marginBottom: '1rem', padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <CheckSquare size={18} color="#3b82f6" />
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Toggle policies on/off or change their action. Changes take effect immediately for all new scans.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {policies.map(policy => (
                <div key={policy.id} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={policy.enabled} onChange={() => togglePolicy(policy)} disabled={!can('policy:write')} />
                    <span className="toggle-slider"></span>
                  </label>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{policy.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{policy.description}</div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px', fontFamily: 'monospace' }}>{policy.id}</div>
                  </div>
                  <select
                    className="action-select"
                    value={policy.action}
                    onChange={e => changeAction(policy, e.target.value)}
                    disabled={!policy.enabled || !can('policy:write')}
                  >
                    {['ALLOW', 'WARN', 'MASK', 'BLOCK', 'HUMAN_REVIEW', 'QUARANTINE'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <DecisionBadge decision={policy.action} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REVIEW QUEUE ── */}
        {tab === 'review' && (
          <div className="fade-in">
            {reviewQueue.length === 0 && (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
                <CheckCircle size={40} style={{ margin: '0 auto 1rem', display: 'block', color: '#10b981' }} />
                No items in review queue.
              </div>
            )}
            {reviewQueue.map(item => (
              <div key={item.id} className="glass-panel review-item">
                <div className="review-header">
                  <div>
                    <DecisionBadge decision={item.decision} />
                    <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>{item.userId}</span>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.5rem' }}>· {item.department}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <RiskBadge level={item.riskLevel || 'HIGH'} />
                    <span style={{ color: '#475569', fontSize: '0.8rem' }}>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.75rem 0' }}>
                  <strong style={{ color: '#cbd5e1' }}>Evidence:</strong> {item.evidence || 'No evidence stored (privacy-first mode)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
                  Policies: {(item.policyHits || []).join(', ') || '—'} · {item.eventType}
                </div>

                {item.status === 'PENDING' ? (
                  selectedReview === item.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {can('review:write') ? (
                      <>
                        <textarea
                        className="review-note"
                        placeholder="Add reviewer note (optional)..."
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-approve" onClick={() => handleApprove(item.id)}><CheckCircle size={14} /> Approve</button>
                        <button className="btn btn-reject" onClick={() => handleReject(item.id)}><X size={14} /> Reject</button>
                        <button className="btn-secondary" onClick={() => setSelectedReview(null)}>Cancel</button>
                      </div>
                      </>
                      ) : <div className="auth-warning">Read-only role. You cannot approve or reject review items.</div>}
                    </div>
                  ) : (
                    <button className="btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => setSelectedReview(item.id)}>
                      Review <ChevronRight size={14} style={{ display: 'inline' }} />
                    </button>
                  )
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className={`badge ${item.status === 'APPROVED' ? 'allow' : 'deny'}`}>{item.status}</span>
                    {item.reviewerNote && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Note: {item.reviewerNote}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* API CLIENTS */}
        {tab === 'devices' && (
          <div className="glass-panel fade-in">
            <h2 className="card-title">API Client Inventory</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead><tr><th>Tenant</th><th>Client</th><th>User</th><th>Status</th><th>Version</th><th>Last Seen</th><th>Action</th></tr></thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={`${device.tenantId}:${device.deviceId}`}>
                      <td>{device.tenantId}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{device.deviceId}</td>
                      <td>{device.userId}</td>
                      <td><span className={`badge ${device.status === 'ACTIVE' ? 'allow' : 'deny'}`}>{device.status}</span></td>
                      <td>{device.clientVersion || '-'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(device.lastSeen).toLocaleString()}</td>
                      <td>
                        <select
                          className="action-select"
                          value={device.status}
                          disabled={!can('device:write')}
                          onChange={e => updateDeviceStatus(device, e.target.value as Device['status'])}
                        >
                          {['ACTIVE', 'SUSPENDED', 'REVOKED'].map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <AdminPortal /> : <LandingPage />;
}
