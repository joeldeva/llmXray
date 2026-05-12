import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, Activity, Server, AlertTriangle, CheckCircle, Clock, FileText, Download, Network, Settings } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];

function App() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  
  // Robotics test state
  const [testMode, setTestMode] = useState('prompt'); // 'prompt' or 'robot'
  const [robotAction, setRobotAction] = useState('MOVE_FORWARD');
  const [robotSpeed, setRobotSpeed] = useState(1.5);
  const [humanCount, setHumanCount] = useState(1);
  const [nearestHuman, setNearestHuman] = useState('near');

  // Policy & UI state
  const [policyYaml, setPolicyYaml] = useState('');
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, policy
  const [recentThreat, setRecentThreat] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail && loginPassword.length > 3) {
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid enterprise credentials');
    }
  };

  useEffect(() => {
    fetchData();
    fetchPolicy();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const fetchPolicy = async () => {
    try {
      const res = await axios.get(`${API_BASE}/policy`);
      setPolicyYaml(res.data.policy);
    } catch (err) {
      console.error("Error fetching policy:", err);
    }
  };

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      await axios.post(`${API_BASE}/policy`, { policy: policyYaml });
      setTimeout(() => setSavingPolicy(false), 800);
    } catch (err) {
      console.error("Error saving policy:", err);
      setSavingPolicy(false);
    }
  };

  const triggerThreatAnimation = () => {
    setRecentThreat(true);
    setTimeout(() => setRecentThreat(false), 2000);
  };

  const handleTestPrompt = async () => {
    if (!testPrompt.trim()) return;
    setTesting(true);
    try {
      const res = await axios.post(`${API_BASE}/test-prompt`, { prompt: testPrompt });
      setTestResult(res.data);
      if (res.data.action !== 'ALLOW') triggerThreatAnimation();
      fetchData(); // Refresh logs
    } catch (err) {
      console.error("Error testing prompt:", err);
    } finally {
      setTesting(false);
    }
  };

  const handleTestRobot = async () => {
    setTesting(true);
    try {
      const payload = {
        action_type: robotAction,
        speed: robotSpeed,
        human_count: humanCount,
        nearest_human_distance: nearestHuman
      };
      const res = await axios.post(`${API_BASE}/test-robot-action`, payload);
      setTestResult(res.data);
      if (res.data.action !== 'ALLOW') triggerThreatAnimation();
      fetchData();
    } catch (err) {
      console.error("Error testing robot action:", err);
    } finally {
      setTesting(false);
    }
  };

  const exportComplianceReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      systemStatus: "Governed",
      stats,
      recentLogs: logs.slice(0, 100)
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustguard-compliance-report-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container animate-fade-in">
        <div className="glass-panel login-box">
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <Shield size={48} color="var(--accent-blue)" style={{marginBottom: '1rem'}} />
            <h2>TrustGuard Enterprise</h2>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem'}}>Sign in to access the DPI Dashboard</p>
          </div>
          <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div>
              <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block'}}>Enterprise Email</label>
              <input type="email" className="input-field" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@enterprise.com" required style={{width: '100%', padding: '0.8rem'}} />
            </div>
            <div>
              <label style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block'}}>Password</label>
              <input type="password" className="input-field" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required style={{width: '100%', padding: '0.8rem'}} />
            </div>
            {loginError && <div style={{color: 'var(--status-deny)', fontSize: '0.85rem'}}>{loginError}</div>}
            <button type="submit" className="btn" style={{width: '100%', padding: '0.8rem', marginTop: '0.5rem'}}>Authenticate Securely</button>
          </form>
          <div style={{textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            Protected by Veea Lobster Trap DPI Infrastructure
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white'}}>Initializing Lobster Trap DPI Proxy...</div>;

  return (
    <div className="dashboard-container">
      <header className="header animate-fade-in" style={{animationDelay: '0.1s'}}>
        <h1><Shield size={32} color="#3b82f6" /> TrustGuard Enterprise DPI Portal <span style={{fontSize: '0.5em', background: 'var(--panel-bg)', padding: '4px 8px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '10px'}}>Powered by Veea Lobster Trap</span></h1>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <button className="btn-secondary" onClick={exportComplianceReport} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Download size={16} /> Export SOC2/HIPAA Report
          </button>
          <div className="badge allow" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Activity size={14}/> System Online</div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
        <button className="btn-secondary" style={{background: activeTab === 'dashboard' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', borderColor: activeTab === 'dashboard' ? 'var(--accent-blue)' : ''}} onClick={() => setActiveTab('dashboard')}>
          <Activity size={16} style={{display: 'inline', marginRight: '8px'}} /> Dashboard
        </button>
        <button className="btn-secondary" style={{background: activeTab === 'policy' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', borderColor: activeTab === 'policy' ? 'var(--accent-blue)' : ''}} onClick={() => setActiveTab('policy')}>
          <Settings size={16} style={{display: 'inline', marginRight: '8px'}} /> YAML Policy Editor
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          <section className="metrics-grid animate-fade-in" style={{animationDelay: '0.2s'}}>
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
              <span className="metric-title">Avg Network Risk Score</span>
              <span className="metric-value" style={{color: 'var(--status-quarantine)'}}>{stats.avgRiskScore}/100</span>
            </div>
          </section>

          {/* Topology Map */}
          <div className="glass-panel animate-fade-in" style={{animationDelay: '0.25s', position: 'relative', overflow: 'hidden'}}>
            <h2 style={{fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Network size={18} /> Multi-Agent Interception Topology</h2>
            <div className="topology-map">
              <div className="connection-line"></div>
              {recentThreat ? <div className="data-flow threat"></div> : <div className="data-flow"></div>}
              
              <div className="node">
                <Server size={24} color="var(--text-secondary)" />
                <span style={{fontSize: '0.8rem'}}>Agent Fleet<br/><span style={{color: 'var(--text-secondary)'}}>(Sales, HR, Bots)</span></span>
              </div>
              <div className="node proxy" style={{transform: recentThreat ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s', borderColor: recentThreat ? 'var(--status-deny)' : 'var(--accent-cyan)'}}>
                <ShieldAlert size={32} color={recentThreat ? "var(--status-deny)" : "var(--accent-cyan)"} />
                <span style={{fontSize: '0.85rem', fontWeight: 'bold'}}>Lobster Trap Proxy</span>
              </div>
              <div className="node">
                <Activity size={24} color="var(--text-secondary)" />
                <span style={{fontSize: '0.8rem'}}>LLM Backend<br/><span style={{color: 'var(--text-secondary)'}}>(OpenAI/Gemini)</span></span>
              </div>
            </div>
          </div>

          <div className="main-grid animate-fade-in" style={{animationDelay: '0.3s'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div className="glass-panel">
                <h2 style={{marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between'}}>
                  Real-Time DPI Audit Logs
                  <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>Bonus: Intent Mismatch Visible</span>
                </h2>
                <div style={{overflowX: 'auto'}}>
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Agent / Intent</th>
                        <th>Risk Score</th>
                        <th>Action</th>
                        <th>Policy Hit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 6).map((log, i) => (
                        <tr key={log.id || i}>
                          <td style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td>
                            <div style={{fontWeight: 500}}>{log.agent}</div>
                            <div style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>
                              <span style={{color: 'var(--text-secondary)'}}>Declared: </span> 
                              <span style={{color: '#f8fafc'}}>{log.declaredIntent}</span>
                            </div>
                            <div style={{fontSize: '0.8rem'}}>
                              <span style={{color: 'var(--text-secondary)'}}>Detected: </span> 
                              <span style={{color: log.declaredIntent !== log.detectedIntent ? 'var(--status-quarantine)' : 'var(--status-allow)'}}>
                                {log.detectedIntent}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                              <div style={{
                                width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%', 
                                  width: `${log.riskScore}%`,
                                  background: log.riskScore > 80 ? 'var(--status-deny)' : log.riskScore > 40 ? 'var(--status-quarantine)' : 'var(--status-allow)'
                                }} />
                              </div>
                              <span style={{fontSize: '0.9rem'}}>{log.riskScore}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${log.action.toLowerCase()}`}>{log.action}</span>
                          </td>
                          <td style={{fontSize: '0.9rem', color: log.policyHit !== 'None' ? 'var(--accent-cyan)' : 'inherit'}}>
                            {log.policyHit || 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div className="glass-panel">
                <h2 style={{marginBottom: '1rem', fontSize: '1.1rem'}}>Threat Distribution</h2>
                <div style={{height: '200px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.threatTypes} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)', borderRadius: '8px'}}
                        itemStyle={{color: 'var(--text-primary)'}}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stats.threatTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel playground" style={{flex: 1}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h2 style={{fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <ShieldAlert size={18} color="var(--status-deny)" />
                    Red-Team Playground
                  </h2>
                </div>
                
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button 
                    onClick={() => setTestMode('prompt')}
                    style={{flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: testMode === 'prompt' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.8rem'}}>
                    LLM Prompt
                  </button>
                  <button 
                    onClick={() => setTestMode('robot')}
                    style={{flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: testMode === 'robot' ? 'var(--status-quarantine)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.8rem'}}>
                    Robot Action
                  </button>
                </div>
                
                {testMode === 'prompt' ? (
                  <>
                    <textarea 
                      className="input-field" 
                      placeholder="Enter a prompt to test (e.g. 'Ignore previous instructions' or 'Give me the patient SSN')"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      style={{minHeight: '80px', fontSize: '0.85rem'}}
                    />
                    <button className="btn" onClick={handleTestPrompt} disabled={testing || !testPrompt.trim()}>
                      {testing ? 'Analyzing...' : 'Execute Payload'}
                    </button>
                  </>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <div style={{flex: 2}}>
                        <select className="input-field" value={robotAction} onChange={(e) => setRobotAction(e.target.value)} style={{width: '100%', padding: '0.5rem', fontSize: '0.85rem'}}>
                          <option value="MOVE_FORWARD">MOVE_FORWARD</option>
                          <option value="NAVIGATE_TO">NAVIGATE_TO</option>
                          <option value="GRIPPER_CLOSE">GRIPPER_CLOSE</option>
                          <option value="SPEED_INCREASE">SPEED_INCREASE</option>
                        </select>
                      </div>
                      <div style={{flex: 1}}>
                        <input type="number" step="0.1" className="input-field" value={robotSpeed} onChange={(e) => setRobotSpeed(parseFloat(e.target.value))} style={{width: '100%', padding: '0.5rem', fontSize: '0.85rem'}} placeholder="Spd" />
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <div style={{flex: 1}}>
                        <input type="number" className="input-field" value={humanCount} onChange={(e) => setHumanCount(parseInt(e.target.value))} style={{width: '100%', padding: '0.5rem', fontSize: '0.85rem'}} placeholder="Humans" />
                      </div>
                      <div style={{flex: 1}}>
                        <select className="input-field" value={nearestHuman} onChange={(e) => setNearestHuman(e.target.value)} style={{width: '100%', padding: '0.5rem', fontSize: '0.85rem'}}>
                          <option value="near">Near</option>
                          <option value="mid">Mid</option>
                          <option value="far">Far</option>
                        </select>
                      </div>
                    </div>
                    <button className="btn" style={{background: 'linear-gradient(135deg, var(--status-quarantine), #ea580c)'}} onClick={handleTestRobot} disabled={testing}>
                      {testing ? 'Evaluating...' : 'Request Action'}
                    </button>
                  </div>
                )}

                {testResult && (
                  <div className={`result-card animate-fade-in ${testResult.action.toLowerCase()}`}>
                    <h3 style={{fontSize: '0.9rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      {testResult.action === 'DENY' ? <AlertTriangle size={16} color="var(--status-deny)" /> : 
                       testResult.action === 'QUARANTINE' ? <Clock size={16} color="var(--status-quarantine)" /> : 
                       <CheckCircle size={16} color="var(--status-allow)" />}
                      Result: {testResult.action}
                    </h3>
                    <div style={{fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem'}}>
                      <p><strong>Intent:</strong> {testResult.detectedIntent}</p>
                      <p><strong>Score:</strong> {testResult.riskScore}/100</p>
                      <p><strong>Hit:</strong> {testResult.policyHit}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-panel animate-fade-in">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <div>
              <h2 style={{fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <FileText size={24} color="var(--accent-blue)" />
                Lobster Trap YAML Policy
              </h2>
              <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                First-match-wins logic. Edit the policy configuration to update agent governance rules in real-time.
              </p>
            </div>
            <button className="btn" onClick={handleSavePolicy} disabled={savingPolicy}>
              {savingPolicy ? 'Saving & Deploying...' : 'Deploy Policy Updates'}
            </button>
          </div>
          <textarea 
            className="code-editor"
            value={policyYaml}
            onChange={(e) => setPolicyYaml(e.target.value)}
            spellCheck="false"
          />
        </div>
      )}
    </div>
  );
}

export default App;
