import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, Activity, AlertTriangle, CheckCircle, Clock, FileText, Download, Settings, Lock, FileCheck, CheckSquare, PuzzleIcon, RefreshCw, X, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import './index.css';

const API = 'http://localhost:3001/api';
// Decision → color map available for future chart use

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = { CRITICAL: 'badge deny', HIGH: 'badge quarantine', MEDIUM: 'badge warn', LOW: 'badge allow' };
  return <span className={map[level] || 'badge allow'}>{level}</span>;
}

function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, string> = { BLOCK: 'badge deny', QUARANTINE: 'badge quarantine', HUMAN_REVIEW: 'badge warn', WARN: 'badge warn', ALLOW: 'badge allow', MASK: 'badge allow' };
  return <span className={map[decision] || 'badge allow'}>{decision}</span>;
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [_loading, setLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [selectedReview, setSelectedReview] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, l, p, r] = await Promise.all([
        axios.get(`${API}/audit/stats`),
        axios.get(`${API}/audit/logs`),
        axios.get(`${API}/policies`),
        axios.get(`${API}/review`),
      ]);
      setStats(s.data);
      setLogs(l.data);
      setPolicies(p.data);
      setReviewQueue(r.data);
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const togglePolicy = async (policy: any) => {
    await axios.put(`${API}/policies/${policy.id}`, { ...policy, enabled: !policy.enabled });
    fetchAll();
  };

  const changeAction = async (policy: any, action: string) => {
    await axios.put(`${API}/policies/${policy.id}`, { ...policy, action });
    fetchAll();
  };

  const handleApprove = async (id: string) => {
    await axios.post(`${API}/review/${id}/approve`, { note: reviewNote });
    setSelectedReview(null);
    setReviewNote('');
    fetchAll();
  };

  const handleReject = async (id: string) => {
    await axios.post(`${API}/review/${id}/reject`, { note: reviewNote });
    setSelectedReview(null);
    setReviewNote('');
    fetchAll();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={16} /> },
    { id: 'audit', label: 'Audit Logs', icon: <FileCheck size={16} /> },
    { id: 'policies', label: 'Policies', icon: <Settings size={16} /> },
    { id: 'review', label: `Review Queue ${reviewQueue.filter(r => r.status === 'PENDING').length > 0 ? `(${reviewQueue.filter(r => r.status === 'PENDING').length})` : ''}`, icon: <Clock size={16} /> },
    { id: 'extension', label: 'Extension', icon: <PuzzleIcon size={16} /> },
  ];

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Shield size={28} color="#3b82f6" />
          <div>
            <div className="brand-name">TrustGuard</div>
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
            <span className="dot-green"></span> Backend Online
          </div>
          <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>TrustGuard v1.0.0</div>
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
            {tab === 'extension' && 'Extension Deployment'}
          </h1>
          <button className="btn-icon" onClick={fetchAll} title="Refresh"><RefreshCw size={16} /></button>
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
                {stats.topPolicyHits?.length > 0 ? (
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
              <button className="btn-secondary"><Download size={14} style={{ display: 'inline', marginRight: '6px' }} />Export Logs</button>
            </div>
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
                    <input type="checkbox" checked={policy.enabled} onChange={() => togglePolicy(policy)} />
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
                    disabled={!policy.enabled}
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

        {/* ── EXTENSION ── */}
        {tab === 'extension' && (
          <div className="fade-in">
            <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
              <h2 className="card-title"><PuzzleIcon size={18} style={{ display: 'inline', marginRight: '8px', color: '#3b82f6' }} />TrustGuard Browser Extension</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>The TrustGuard Chrome/Edge extension monitors all ChatGPT usage on company-managed devices. It scans prompts, pasted content, and file uploads before they reach ChatGPT.</p>
              <div className="extension-stats">
                {[
                  { label: 'Protected Domains', value: 'chatgpt.com, chat.openai.com' },
                  { label: 'Manifest Version', value: 'Manifest V3' },
                  { label: 'Extension Version', value: '1.0.0' },
                  { label: 'Scan Mode', value: 'Active (Block + Warn + Review)' },
                ].map(s => (
                  <div key={s.label} className="extension-stat">
                    <span className="stat-label">{s.label}</span>
                    <span className="stat-value">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel">
              <h2 className="card-title">How to Load the Extension (Development)</h2>
              <ol className="install-steps">
                <li><strong>Open Chrome/Edge</strong> and navigate to <code>chrome://extensions</code></li>
                <li>Enable <strong>Developer Mode</strong> (toggle in the top right)</li>
                <li>Click <strong>"Load unpacked"</strong> and select the <code>/extension</code> folder from the project</li>
                <li>The TrustGuard extension will appear. Pin it to your toolbar.</li>
                <li>Open <strong>chatgpt.com</strong> and look for the <strong>"Protected by TrustGuard"</strong> badge in the bottom-right corner.</li>
                <li>Type a risky prompt like <code>Here is my key: sk-1234567890abcdef</code> and click Send. TrustGuard will block it.</li>
              </ol>

              <div className="warning-box" style={{ marginTop: '1.5rem' }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#f59e0b' }}>Enterprise Deployment Note:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                    For production, the extension should be force-installed via Chrome/Edge group policy (GPO). This prevents employees from disabling it. See <code>docs/enterprise-extension-deployment.md</code> for full deployment guide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
