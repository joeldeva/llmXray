import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, Activity, Server, AlertTriangle, CheckCircle, Clock, Download, Network, Settings, Upload, Lock, Database, FileCheck, CheckSquare, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import './index.css';

const API_BASE = 'http://localhost:3001/api';
const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];

function App() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Auth & RBAC
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [userRole, setUserRole] = useState('Security Admin');

  // Playground state
  const [testPrompt, setTestPrompt] = useState('');
  const [testAgent, setTestAgent] = useState('LangChain');
  const [testDirection, setTestDirection] = useState('Ingress');
  const [testFileContent, setTestFileContent] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, audit, policy, playground
  const [recentThreat, setRecentThreat] = useState(false);

  // Policy Builder State
  const [policyConfig, setPolicyConfig] = useState({
    blockPii: true,
    blockSecrets: true,
    requireApprovalFinance: true,
    strictEgress: true,
    falsePositiveThreshold: 60
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/logs`),
        axios.get(`${API_BASE}/stats`)
      ]);
      setLogs(logsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (loginEmail && loginPassword.length > 3) {
      setIsAuthenticated(true);
      if (loginEmail.includes('hr')) setUserRole('HR Manager');
      else if (loginEmail.includes('dev')) setUserRole('Developer');
    } else {
      setLoginError('Invalid enterprise credentials');
    }
  };

  const ssoLogin = (provider: string) => {
    setLoginEmail(`admin@${provider.toLowerCase()}.com`);
    setLoginPassword('password123');
    setIsAuthenticated(true);
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      // Mock OCR / File Parsing
      setTimeout(() => {
        setTestFileContent(`[Extracted from ${file.name}] Confidential: Q3 Earnings Report. Client SSN: 123-45-6789. API Key: sk-live-99x283hd. Aadhaar: 9876 5432 1098`);
      }, 800);
    }
  };

  const handleTestSubmit = async () => {
    if (!testPrompt.trim() && !testFileContent) return;
    setTesting(true);
    try {
      const res = await axios.post(`${API_BASE}/test-prompt`, { 
        prompt: testPrompt,
        agent_framework: testAgent,
        direction: testDirection,
        file_content: testFileContent
      });
      setTestResult(res.data);
      if (res.data.action !== 'ALLOW') {
        setRecentThreat(true);
        setTimeout(() => setRecentThreat(false), 2000);
      }
      fetchData();
    } catch (err: any) {
      console.error("Error testing:", err);
      if (err.response && err.response.data && err.response.data.error) {
         setTestResult({
             action: 'ERROR',
             policyHit: err.response.data.error,
             riskScore: 0,
             detectedIntent: err.response.data.details || 'Connection failed',
             direction: testDirection
         });
      }
    } finally {
      setTesting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container animate-fade-in">
        <div className="glass-panel login-box" style={{maxWidth: '450px'}}>
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <Shield size={48} color="var(--accent-blue)" style={{marginBottom: '1rem', display: 'inline-block'}} />
            <h2>TrustGuard Enterprise</h2>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem'}}>Identity-based Governance & DPI Proxy</p>
          </div>
          
          <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <button className="btn-secondary" style={{flex: 1, fontSize: '0.8rem'}} onClick={() => ssoLogin('AzureAD')}><Users size={14}/> Azure AD</button>
            <button className="btn-secondary" style={{flex: 1, fontSize: '0.8rem'}} onClick={() => ssoLogin('Okta')}><Lock size={14}/> Okta SSO</button>
          </div>
          
          <div style={{textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem'}}>OR CONTINUE WITH EMAIL</div>

          <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <input type="email" className="input-field" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@enterprise.com" required style={{width: '100%', padding: '0.8rem'}} />
            <input type="password" className="input-field" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required style={{width: '100%', padding: '0.8rem'}} />
            {loginError && <div style={{color: 'var(--status-deny)', fontSize: '0.85rem'}}>{loginError}</div>}
            <button type="submit" className="btn" style={{width: '100%', padding: '0.8rem', marginTop: '0.5rem'}}>Secure Login</button>
          </form>
          <div style={{textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            Protected by Veea Lobster Trap DPI Infrastructure
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white'}}>Connecting to Lobster Trap Proxy...</div>;

  return (
    <div className="dashboard-container">
      <header className="header animate-fade-in" style={{animationDelay: '0.1s'}}>
        <h1><Shield size={32} color="#3b82f6" /> TrustGuard Enterprise DPI Portal</h1>
        <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
            <Users size={16} /> Role: <span style={{color: 'white', fontWeight: 'bold'}}>{userRole}</span>
          </div>
          <div className="badge allow" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Activity size={14}/> Proxy Online</div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem'}}>
        {['dashboard', 'audit', 'policy', 'playground'].map(tab => (
          <button 
            key={tab}
            className="btn-secondary" 
            style={{background: activeTab === tab ? 'rgba(59, 130, 246, 0.2)' : 'transparent', borderColor: activeTab === tab ? 'var(--accent-blue)' : '', textTransform: 'capitalize'}} 
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'audit' && <FileCheck size={16} style={{display: 'inline', marginRight: '8px'}} />}
            {tab === 'policy' && <Settings size={16} style={{display: 'inline', marginRight: '8px'}} />}
            {tab === 'playground' && <AlertTriangle size={16} style={{display: 'inline', marginRight: '8px'}} />}
            {tab === 'dashboard' && <Activity size={16} style={{display: 'inline', marginRight: '8px'}} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-fade-in">
          <section className="metrics-grid">
            <div className="glass-panel metric-card">
              <span className="metric-title">Total Intercepts</span>
              <span className="metric-value">{stats.totalIntercepts}</span>
            </div>
            <div className="glass-panel metric-card">
              <span className="metric-title">Critical Threats Blocked</span>
              <span className="metric-value" style={{color: 'var(--status-deny)'}}>{stats.criticalThreats}</span>
            </div>
            <div className="glass-panel metric-card">
              <span className="metric-title">Active AI Agents</span>
              <span className="metric-value" style={{color: 'var(--accent-blue)'}}>{stats.activeAgents}</span>
            </div>
            <div className="glass-panel metric-card">
              <span className="metric-title">Compliance Readiness</span>
              <span className="metric-value" style={{color: 'var(--status-allow)'}}>98%</span>
            </div>
          </section>

          <div className="main-grid" style={{marginTop: '1.5rem'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div className="glass-panel">
                <h2 style={{marginBottom: '1rem', fontSize: '1.1rem'}}><CheckSquare size={18} style={{display:'inline', marginRight:'8px'}}/> Compliance Posture Mapping</h2>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  {[
                    { name: 'GDPR (EU)', score: 100, color: 'var(--status-allow)' },
                    { name: 'HIPAA (US)', score: 100, color: 'var(--status-allow)' },
                    { name: 'SOC 2 Type II', score: 95, color: 'var(--accent-blue)' },
                    { name: 'DPDP Act (India)', score: 100, color: 'var(--status-allow)' }
                  ].map(c => (
                    <div key={c.name} style={{background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                        <span style={{fontSize: '0.9rem', fontWeight: 'bold'}}>{c.name}</span>
                        <span style={{color: c.color, fontSize: '0.9rem'}}>{c.score}%</span>
                      </div>
                      <div style={{width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px'}}>
                        <div style={{width: `${c.score}%`, height: '100%', background: c.color, borderRadius: '2px'}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel" style={{position: 'relative', overflow: 'hidden'}}>
                <h2 style={{fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Network size={18} /> Multi-Agent Interception Topology</h2>
                <div className="topology-map">
                  <div className="connection-line"></div>
                  {recentThreat ? <div className="data-flow threat"></div> : <div className="data-flow"></div>}
                  <div className="node"><Server size={24} color="var(--text-secondary)" /><span style={{fontSize: '0.8rem'}}>Agent Fleet<br/><span style={{color: 'var(--text-secondary)'}}>(LangChain, AutoGen)</span></span></div>
                  <div className="node proxy" style={{transform: recentThreat ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s', borderColor: recentThreat ? 'var(--status-deny)' : 'var(--accent-cyan)'}}>
                    <ShieldAlert size={32} color={recentThreat ? "var(--status-deny)" : "var(--accent-cyan)"} />
                    <span style={{fontSize: '0.85rem', fontWeight: 'bold'}}>Lobster Trap Proxy</span>
                  </div>
                  <div className="node"><Database size={24} color="var(--text-secondary)" /><span style={{fontSize: '0.8rem'}}>LLM Backend<br/><span style={{color: 'var(--text-secondary)'}}>(OpenAI, Gemini)</span></span></div>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <h2 style={{marginBottom: '1rem', fontSize: '1.1rem'}}>Threat Distribution (Ingress & Egress)</h2>
              <div style={{height: '300px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.threatTypes} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)', borderRadius: '8px'}} itemStyle={{color: 'var(--text-primary)'}} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {stats.threatTypes.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="glass-panel animate-fade-in">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h2 style={{fontSize: '1.2rem'}}>Tamper-Proof Audit Logs</h2>
            <button className="btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Download size={16} /> Export SOC2 Logs</button>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Dir / App</th>
                  <th>Risk</th>
                  <th>Action / Policy Hit</th>
                  <th>Cryptographic Signature</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id || i}>
                    <td style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td>
                      <div style={{fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px'}}>
                        {log.direction === 'Egress' ? <span style={{color: 'var(--accent-blue)'}}>← Egress</span> : <span style={{color: 'var(--accent-cyan)'}}>→ Ingress</span>}
                      </div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem'}}>{log.agent}</div>
                    </td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <div style={{width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'}}>
                          <div style={{height: '100%', width: `${log.riskScore}%`, background: log.riskScore > 80 ? 'var(--status-deny)' : log.riskScore > 40 ? 'var(--status-quarantine)' : 'var(--status-allow)'}} />
                        </div>
                        <span style={{fontSize: '0.9rem'}}>{log.riskScore}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${log.action.toLowerCase()}`}>{log.action}</span>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem'}}>{log.policyHit}</div>
                    </td>
                    <td>
                      <div style={{fontSize: '0.75rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-cyan)'}}>
                        <Lock size={10} style={{display:'inline', marginRight:'4px'}}/>
                        {log.hash ? `${log.hash.substring(0,16)}...` : 'signing...'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'policy' && (
        <div className="glass-panel animate-fade-in">
          <h2 style={{fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Settings size={20} color="var(--accent-blue)"/> Admin Visual Policy Builder</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem'}}>Configure enterprise DPI rules without writing code. Settings automatically compile to Lobster Trap YAML.</p>
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems:'center', gap:'0.5rem'}}><Database size={16}/> Data Loss Prevention (DLP)</h3>
                
                <label style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', cursor: 'pointer'}}>
                  <input type="checkbox" checked={policyConfig.blockPii} onChange={e => setPolicyConfig({...policyConfig, blockPii: e.target.checked})} style={{width: '18px', height: '18px', accentColor: 'var(--accent-blue)'}} />
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>Block PII & Entity Leaks</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Detect SSN, Credit Cards, Aadhaar IDs, Emails. Maps to GDPR/DPDP.</div>
                  </div>
                </label>

                <label style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer'}}>
                  <input type="checkbox" checked={policyConfig.blockSecrets} onChange={e => setPolicyConfig({...policyConfig, blockSecrets: e.target.checked})} style={{width: '18px', height: '18px', accentColor: 'var(--accent-blue)'}} />
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>Block Secrets & API Keys</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Intercept API tokens, Passwords, Private Keys via regex.</div>
                  </div>
                </label>
              </div>

              <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems:'center', gap:'0.5rem'}}><Users size={16}/> Role-Based Access Control (RBAC)</h3>
                <label style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer'}}>
                  <input type="checkbox" checked={policyConfig.requireApprovalFinance} onChange={e => setPolicyConfig({...policyConfig, requireApprovalFinance: e.target.checked})} style={{width: '18px', height: '18px', accentColor: 'var(--accent-blue)'}} />
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>Require Manager Approval for Finance Agents</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Triggers HUMAN_REVIEW state instead of ALLOW for high-risk groups.</div>
                  </div>
                </label>
              </div>

            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems:'center', gap:'0.5rem'}}><CheckCircle size={16}/> Egress & False Positive Tuning</h3>
                
                <label style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', cursor: 'pointer'}}>
                  <input type="checkbox" checked={policyConfig.strictEgress} onChange={e => setPolicyConfig({...policyConfig, strictEgress: e.target.checked})} style={{width: '18px', height: '18px', accentColor: 'var(--accent-blue)'}} />
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>Response-Side Scanning (Egress)</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Scan the LLM output to ensure it doesn't hallucinate sensitive info.</div>
                  </div>
                </label>

                <div>
                  <div style={{fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.5rem'}}>False-Positive Threshold (Risk Score)</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>If blocks are frustrating employees, increase the tolerance score.</div>
                  <input type="range" min="10" max="95" value={policyConfig.falsePositiveThreshold} onChange={e => setPolicyConfig({...policyConfig, falsePositiveThreshold: Number(e.target.value)})} style={{width: '100%', accentColor: 'var(--accent-blue)'}} />
                  <div style={{textAlign: 'right', fontSize: '0.8rem', color: 'var(--accent-cyan)'}}>{policyConfig.falsePositiveThreshold} / 100</div>
                </div>
              </div>
              <button className="btn" style={{padding: '1rem'}}>Compile & Deploy to Proxy</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'playground' && (
        <div className="glass-panel playground animate-fade-in" style={{maxWidth: '800px', margin: '0 auto'}}>
          <h2 style={{fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <AlertTriangle size={20} color="var(--status-deny)" />
            Enterprise Red-Team Testing
          </h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem'}}>Simulate API calls, file uploads, and prompts from various Agent frameworks to test your Lobster Trap DPI rules.</p>
          
          <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
            <div style={{flex: 1}}>
              <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block'}}>Agent Framework Integration</label>
              <select className="input-field" value={testAgent} onChange={e => setTestAgent(e.target.value)} style={{width: '100%', padding: '0.5rem', fontSize: '0.9rem'}}>
                <option value="LangChain">LangChain App</option>
                <option value="AutoGen">Microsoft AutoGen</option>
                <option value="Claude-Computer-Use">Claude Computer Use</option>
                <option value="Custom API CRM">Custom CRM API Tool</option>
              </select>
            </div>
            <div style={{flex: 1}}>
              <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block'}}>Traffic Direction</label>
              <select className="input-field" value={testDirection} onChange={e => setTestDirection(e.target.value)} style={{width: '100%', padding: '0.5rem', fontSize: '0.9rem'}}>
                <option value="Ingress">Ingress (User/Agent Prompt)</option>
                <option value="Egress">Egress (LLM Response Scanning)</option>
              </select>
            </div>
          </div>

          <div style={{background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem', cursor: 'pointer', position: 'relative'}} onClick={() => document.getElementById('file-upload')?.click()}>
            <input type="file" id="file-upload" style={{display: 'none'}} onChange={handleFileUpload} />
            <Upload size={24} color="var(--text-secondary)" style={{margin: '0 auto 0.5rem auto'}} />
            <div style={{fontSize: '0.9rem'}}>File Upload & OCR Scanning Test</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem'}}>Upload PDF, Image, or Excel file (Simulates text extraction before LLM)</div>
            {testFileContent && <div style={{marginTop: '1rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--accent-cyan)', textAlign: 'left'}}><CheckCircle size={12} style={{display:'inline', marginRight:'4px'}}/> OCR Success: {testFileContent.substring(0, 50)}...</div>}
          </div>
          
          <textarea 
            className="input-field" 
            placeholder="Type a test prompt (e.g. 'Here is my key sk-live-123' or 'Aadhaar 1234')"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            style={{minHeight: '100px', fontSize: '0.9rem', width: '100%', marginBottom: '1rem'}}
          />
          <button className="btn" onClick={handleTestSubmit} disabled={testing || (!testPrompt.trim() && !testFileContent)} style={{width: '100%', padding: '0.8rem'}}>
            {testing ? 'Proxy Inspecting...' : 'Simulate API Call'}
          </button>

          {testResult && (
            <div className={`result-card animate-fade-in ${testResult.action === 'ERROR' ? 'deny' : testResult.action.toLowerCase()}`} style={{marginTop: '1.5rem'}}>
              <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                {testResult.action === 'DENY' || testResult.action === 'ERROR' ? <AlertTriangle size={18} color="var(--status-deny)" /> : 
                 testResult.action === 'QUARANTINE' ? <Clock size={18} color="var(--status-quarantine)" /> : 
                 <CheckCircle size={18} color="var(--status-allow)" />}
                {testResult.action === 'ERROR' ? 'Proxy Connection Failed' : `DPI Verdict: ${testResult.action}`}
              </h3>
              <div style={{fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                <p><strong>Intent:</strong> {testResult.detectedIntent}</p>
                <p><strong>Risk Score:</strong> {testResult.riskScore}/100</p>
                <p><strong>Policy Hit:</strong> {testResult.policyHit}</p>
                <p><strong>Direction:</strong> {testResult.direction}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
