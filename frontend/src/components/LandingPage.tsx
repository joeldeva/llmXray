import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Shield, ChevronRight, CheckCircle, Server, Monitor, Menu, X, Database, Key, Users, Code2, FileLock, LineChart, UserCheck, ShieldAlert, TerminalSquare } from 'lucide-react';
import './landing.css';

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const links = ['Problem','Solution','How It Works','Detection','Privacy','Developers','Dashboard'];
  return (
    <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
      <div className="lp-nav__inner">
        <div className="lp-nav__left">
          <a href="/" className="lp-logo">
            <Shield size={22} className="lp-logo-icon" />
            <span>LLMXRAY</span>
          </a>
        </div>
        <div className="lp-nav__links">
          {links.map(l => <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,'-')}`}>{l}</a>)}
        </div>
        <div className="lp-nav__right">
          <a href="#demo" className="lp-btn lp-btn--primary">Book Demo</a>
        </div>
        <button className="lp-hamburger" onClick={() => setOpen(o => !o)}>{open ? <X size={24}/> : <Menu size={24}/>}</button>
      </div>
      {open && (
        <div className="lp-mobile-menu">
          {links.map(l => <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,'-')}`} onClick={() => setOpen(false)}>{l}</a>)}
          <a href="#demo" className="lp-btn lp-btn--primary" onClick={() => setOpen(false)}>Book Demo</a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 20;
    const y = (clientY / innerHeight - 0.5) * 20;
    mouseX.set(x);
    mouseY.set(y);
  };

  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  return (
    <section className="lp-hero" onMouseMove={handleMouseMove}>
      <div className="lp-hero__content">
        <motion.div className="lp-hero__copy" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fade} className="lp-tag">
            <span className="lp-dot"/>Enterprise AI Security Gateway
          </motion.div>
          <motion.h1 variants={fade} className="lp-hero__h1">
            X-ray every prompt<br/>before it reaches AI.
          </motion.h1>
          <motion.p variants={fade} className="lp-hero__sub">
            LLMXRAY scans prompts and files in real time, detects sensitive data, enforces policy decisions, and logs masked audit evidence without storing raw content.
          </motion.p>
          <motion.div variants={fade} className="lp-hero__actions">
            <a href="#demo" className="lp-btn lp-btn--primary lp-btn--lg">View Demo</a>
            <a href="#api" className="lp-btn lp-btn--outline lp-btn--lg">Read API Docs</a>
          </motion.div>
          <motion.div variants={fade} className="lp-hero__trust-chips">
            <div className="lp-trust-chip"><CheckCircle size={14}/> No raw content stored</div>
            <div className="lp-trust-chip"><CheckCircle size={14}/> Provider-agnostic</div>
            <div className="lp-trust-chip"><CheckCircle size={14}/> Real-time policy engine</div>
          </motion.div>
        </motion.div>
      </div>
      <div className="lp-hero__media">
        <div className="lp-hero__media-mask"></div>
        <div className="lp-hero__media-overlay"></div>
        <motion.div 
          className="lp-hero__video-wrapper"
          style={{ x, y }}
          whileHover="hover"
        >
          <video 
            ref={videoRef} 
            autoPlay 
            loop 
            muted 
            playsInline 
            poster="/llmxray-hero-image.jpeg" 
            className="lp-hero__video"
          >
            <source src="/llmxray-hero-video.mp4" type="video/mp4"/>
          </video>
          
          <motion.div className="lp-video-hover-label" variants={{ hover: { opacity: 1, scale: 1 } }} initial={{ opacity: 0, scale: 0.9 }}>
            Real-time scan preview
          </motion.div>
          
          <motion.div className="lp-hero-badge lp-hero-badge--block" animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <span className="lp-badge-dot bg-red-500"></span> BLOCKED · Risk 94
          </motion.div>
          
          <motion.div className="lp-hero-badge lp-hero-badge--mask" animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
            <span className="lp-badge-dot bg-blue-500"></span> MASKED · PII
          </motion.div>
          
          <motion.div className="lp-hero-badge lp-hero-badge--allow" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
            <span className="lp-badge-dot bg-emerald-500"></span> ALLOW · Risk 12
          </motion.div>
          
          <div className="lp-scan-line"></div>
          <div className="lp-scan-status">
            <span className="lp-scan-dot"></span> Live AI traffic scan
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatBar() {
  const stats = [
    { label: 'Scan Decisions', value: '124K+' },
    { label: 'Threat Categories', value: '18' },
    { label: 'Avg Latency', value: '<50ms' },
    { label: 'Policy Outcomes', value: '5' },
  ];
  return (
    <section className="lp-stats">
      <div className="lp-container lp-stats__grid">
        {stats.map(s => (
          <motion.div key={s.label} className="lp-stat" variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="lp-stat__val">{s.value}</div>
            <div className="lp-stat__label">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    { icon: Key, label: 'API Keys' },
    { icon: Users, label: 'Customer Data' },
    { icon: LineChart, label: 'Salary Sheets' },
    { icon: Code2, label: 'Source Code' },
    { icon: UserCheck, label: 'Aadhaar / PAN' },
    { icon: FileLock, label: 'Contracts' },
    { icon: Database, label: 'Financial Records' },
    { icon: ShieldAlert, label: 'Internal Strategy' },
  ];
  return (
    <section className="lp-section lp-section--dark" id="problem">
      <div className="lp-container">
        <div className="lp-section__head">
          <motion.h2 variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Employees are already sending<br/>sensitive data to AI.</motion.h2>
          <motion.p variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Employees accidentally paste API keys, customer records, salary sheets, source code, Aadhaar/PAN data, financial records, legal contracts, and confidential documents into AI tools. Most leaks are accidental, but once sensitive data reaches an AI provider, companies lose visibility and control.</motion.p>
        </div>
        <motion.div className="lp-grid lp-grid--4" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {items.map(({ icon: Icon, label }) => (
            <motion.div key={label} variants={fade} className="lp-card lp-card--icon">
              <Icon size={24} className="lp-icon-muted" />
              <span className="lp-card-title">{label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section className="lp-section" id="solution">
      <div className="lp-container">
        <div className="lp-section__head">
          <motion.h2 variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Put a security gateway in front of every AI request.</motion.h2>
          <motion.p variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>LLMXRAY sits between your application and AI providers. It scans prompts and files before they leave your environment, calculates risk, applies policy, and creates masked audit evidence.</motion.p>
        </div>
        <motion.div className="lp-flow" variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {[{ icon: Monitor, label: 'App / Employee' }, { icon: Shield, label: 'LLMXRAY Gateway', active: true }, { icon: Server, label: 'AI Provider' }].map((node, i, arr) => (
            <div key={node.label} className="lp-flow__item">
              <div className={`lp-flow__node ${node.active ? 'lp-flow__node--active' : ''}`}>
                <node.icon size={28}/>
                <span>{node.label}</span>
              </div>
              {i < arr.length - 1 && <div className="lp-flow__arrow"><ChevronRight size={20}/></div>}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Request received', desc: 'A prompt or file is sent to the LLMXRAY API.' },
    { n: '02', title: 'Scan and classify', desc: 'LLMXRAY detects secrets, PII, financial data, source code leaks, prompt injection, dangerous files, and confidential markers.' },
    { n: '03', title: 'Score risk', desc: 'Each request gets a risk score from 0 to 100 and a risk level: LOW, MEDIUM, HIGH, or CRITICAL.' },
    { n: '04', title: 'Enforce policy', desc: 'The policy engine returns ALLOW, WARN, MASK, BLOCK, or HUMAN_REVIEW.' },
    { n: '05', title: 'Audit safely', desc: 'LLMXRAY logs masked evidence, metadata, policy hits, and risk score without storing raw prompt or file content.' },
  ];
  return (
    <section className="lp-section lp-section--dark" id="how-it-works">
      <div className="lp-container lp-split">
        <motion.div className="lp-split__left" variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <h2>How it works</h2>
        </motion.div>
        <motion.div className="lp-split__right lp-steps" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {steps.map(s => (
            <motion.div key={s.n} variants={fade} className="lp-step">
              <div className="lp-step__num">{s.n}</div>
              <div className="lp-step__content">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Detection() {
  const items = ['Secrets and API keys','Aadhaar and PAN numbers','Customer records','Financial data','Salary and HR files','Source code leaks','Prompt injection','Dangerous files','Confidential documents','Database URLs and tokens'];
  return (
    <section className="lp-section" id="detection">
      <div className="lp-container">
        <div className="lp-section__head">
          <motion.h2 variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Detect the data your teams<br/>should never send to AI.</motion.h2>
        </div>
        <motion.div className="lp-grid lp-grid--3" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {items.map(item => (
            <motion.div key={item} variants={fade} className="lp-check-item">
              <CheckCircle size={18} className="lp-check-icon"/>{item}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Policies() {
  const cards = [
    { d: 'ALLOW', desc: 'Safe request. Continue normally.' },
    { d: 'WARN', desc: 'Risk detected. User should confirm.' },
    { d: 'MASK', desc: 'Sensitive content is redacted before forwarding.' },
    { d: 'BLOCK', desc: 'Critical risk. Request is stopped.' },
    { d: 'HUMAN_REVIEW', desc: 'Needs security or admin review.' },
  ];
  return (
    <section className="lp-section lp-section--dark" id="policies">
      <div className="lp-container">
        <div className="lp-section__head">
          <motion.h2 variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Clear decisions before data leaves.</motion.h2>
        </div>
        <motion.div className="lp-grid lp-grid--5" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {cards.map(c => (
            <motion.div key={c.d} variants={fade} className="lp-card lp-card--policy">
              <span className={`lp-badge lp-badge--${c.d.toLowerCase()}`}>{c.d}</span>
              <p>{c.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Privacy() {
  return (
    <section className="lp-section" id="privacy">
      <div className="lp-container lp-two-col">
        <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <h2>Security without storing the secret.</h2>
          <p className="lp-mt">LLMXRAY is designed to avoid storing raw prompts and raw file contents. Audit trails store only masked evidence, file metadata, policy hits, risk scores, timestamps, user/department metadata, and decision results.</p>
          <ul className="lp-check-list lp-mt">
            <li><CheckCircle size={18}/>Designed to minimize sensitive data retention.</li>
            <li><CheckCircle size={18}/>Helps security teams maintain visibility and control.</li>
            <li><CheckCircle size={18}/>Helps demonstrate reasonable AI data-security controls.</li>
          </ul>
        </motion.div>
        <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="lp-code-card">
          <div className="lp-code-card__header">Audit Log Entry (Masked)</div>
          <pre className="lp-code--json">{`{
  "timestamp": "2026-05-15T14:32:00Z",
  "user": "eng_lead@company.com",
  "action": "BLOCK",
  "policy": "POL_SECRET_DETECTED",
  "evidence": "sk-proj-*********...",
  "raw_prompt_stored": false
}`}</pre>
        </motion.div>
      </div>
    </section>
  );
}

function ApiSection() {
  return (
    <section className="lp-section lp-section--dark" id="api">
      <div className="lp-container">
        <div className="lp-section__head">
          <motion.h2 variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Simple API integration.</motion.h2>
        </div>
        <motion.div className="lp-two-col" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.div variants={fade} className="lp-code-card">
            <div className="lp-code-card__header"><TerminalSquare size={14}/> Request</div>
            <pre className="lp-code--req">{`const response = await fetch("https://api.llmxray.com/api/scan/prompt", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.LLMXRAY_API_KEY
  },
  body: JSON.stringify({
    prompt,
    userId: "employee@company.com",
    site: "chatgpt.com",
    department: "Engineering"
  })
});`}</pre>
          </motion.div>
          <motion.div variants={fade} className="lp-code-card">
            <div className="lp-code-card__header"><Database size={14}/> Response</div>
            <pre className="lp-code--res">{`{
  "decision": "BLOCK",
  "riskScore": 90,
  "riskLevel": "CRITICAL",
  "policyHits": ["POL_SECRET_BLOCK"],
  "findings": ["AWS Access Key ID", "AWS Secret Key"]
}`}</pre>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Dashboard() {
  return (
    <section className="lp-section" id="dashboard">
      <div className="lp-container">
        <div className="lp-section__head">
          <motion.h2 variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Enterprise Visibility</motion.h2>
        </div>
        <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="lp-dashboard">
          <div className="lp-dashboard__nav">
            <div className="lp-dashboard__title">Overview</div>
            <div className="lp-dashboard__tabs">
              <span>Risk Trends</span>
              <span className="active">Policy Hits</span>
              <span>Audit Logs</span>
            </div>
          </div>
          <div className="lp-db-stats">
            <div className="lp-db-stat"><div className="lp-db-stat__label">Total Scans</div><div className="lp-db-stat__val">124,592</div></div>
            <div className="lp-db-stat"><div className="lp-db-stat__label">Blocked Requests</div><div className="lp-db-stat__val lp-text-red">3,104</div></div>
            <div className="lp-db-stat"><div className="lp-db-stat__label">Warnings Issued</div><div className="lp-db-stat__val lp-text-yellow">8,421</div></div>
            <div className="lp-db-stat"><div className="lp-db-stat__label">In Review Queue</div><div className="lp-db-stat__val lp-text-blue">14</div></div>
          </div>
          <div className="lp-db-bottom">
            <div className="lp-db-panel">
              <div className="lp-db-panel__title">Top Policy Hits</div>
              <div className="lp-db-list">
                <div className="lp-db-list-item"><span>Secrets Detected</span><span>1,000</span></div>
                <div className="lp-db-list-item"><span>PII</span><span>500</span></div>
                <div className="lp-db-list-item"><span>Financial Data</span><span>333</span></div>
                <div className="lp-db-list-item"><span>Source Code</span><span>250</span></div>
              </div>
            </div>
            <div className="lp-db-panel">
              <div className="lp-db-panel__title">Department-wise AI Risk</div>
              <div className="lp-db-list">
                <div className="lp-db-list-item"><span>Engineering</span><div className="lp-db-bar-wrap"><div className="lp-db-bar" style={{ width: '80%', background: '#ef4444' }}></div></div></div>
                <div className="lp-db-list-item"><span>Sales</span><div className="lp-db-bar-wrap"><div className="lp-db-bar" style={{ width: '45%', background: '#f59e0b' }}></div></div></div>
                <div className="lp-db-list-item"><span>HR</span><div className="lp-db-bar-wrap"><div className="lp-db-bar" style={{ width: '60%', background: '#f59e0b' }}></div></div></div>
                <div className="lp-db-list-item"><span>Marketing</span><div className="lp-db-bar-wrap"><div className="lp-db-bar" style={{ width: '20%', background: '#3b82f6' }}></div></div></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = ['SaaS engineering teams','Fintech AI workflows','Healthcare data protection','IT services delivery teams','Internal enterprise AI tools','Developer copilots and AI agents'];
  return (
    <section className="lp-section lp-section--dark">
      <div className="lp-container">
        <div className="lp-section__head">
          <motion.h2 variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>Who uses LLMXRAY?</motion.h2>
        </div>
        <motion.div className="lp-grid lp-grid--3" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {cases.map(c => (
            <motion.div key={c} variants={fade} className="lp-card lp-card--usecase">{c}</motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="lp-cta" id="demo">
      <div className="lp-container lp-cta__inner">
        <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <h2>Adopt AI safely without<br/>losing control of your data.</h2>
          <div className="lp-hero__actions lp-center-actions">
            <a href="#demo" className="lp-btn lp-btn--primary lp-btn--lg">Book a Demo</a>
            <a href="#api" className="lp-btn lp-btn--outline lp-btn--lg">View API Docs</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="lp-root">
      <Nav/>
      <Hero/>
      <StatBar/>
      <Problem/>
      <Solution/>
      <HowItWorks/>
      <Detection/>
      <Policies/>
      <Privacy/>
      <ApiSection/>
      <Dashboard/>
      <UseCases/>
      <CTA/>
      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <div className="lp-logo"><Shield size={18} className="text-blue-500"/><span>LLMXRAY</span></div>
          <div className="lp-footer__links">
            <a href="#problem">Problem</a>
            <a href="#solution">Solution</a>
            <a href="#api">Developers</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
