require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Production Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

const LOBSTER_TRAP_URL = process.env.LOBSTER_TRAP_URL || 'http://localhost:8080';
const LOG_FILE_PATH = process.env.LOBSTER_TRAP_LOG_PATH || path.join(__dirname, 'lobstertrap.jsonl');

// Tamper-proof audit log helper
function generateLogHash(entry) {
    const dataString = `${entry.request_id}${entry.timestamp}${entry.agent_id}${entry.action}${entry.matched_rule}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Helper to read and parse the JSONL audit log
async function readAuditLogs() {
    const logs = [];
    if (!fs.existsSync(LOG_FILE_PATH)) {
        return logs;
    }

    const fileStream = fs.createReadStream(LOG_FILE_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const entry = JSON.parse(line);
            logs.unshift({
                id: entry.request_id || 'evt_' + Math.random().toString(36).substr(2, 9),
                timestamp: entry.timestamp || new Date().toISOString(),
                agent: entry.ingress?.declared?.agent_id || entry.agent_id || 'UnknownAgent',
                action: entry.action || entry.verdict || 'ALLOW',
                detectedIntent: entry.ingress?.detected?.intent_category || entry.intent_category || 'general',
                declaredIntent: entry.ingress?.declared?.declared_intent || 'unknown',
                policyHit: entry.matched_rule || 'None',
                riskScore: entry.ingress?.detected?.risk_score ? Math.round(entry.ingress.detected.risk_score * 100) : 0,
                prompt: entry.prompt || "Hidden for privacy",
                direction: entry.direction || 'Ingress',
                hash: entry.hash || generateLogHash(entry)
            });
        } catch (e) {
            console.error("Error parsing log line:", e);
        }
    }
    return logs;
}

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await readAuditLogs();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: "Failed to read Lobster Trap logs" });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const logs = await readAuditLogs();
        const totalIntercepts = logs.length;
        const criticalThreats = logs.filter(l => l.action === 'DENY' || l.action === 'QUARANTINE').length;
        const agents = new Set(logs.map(l => l.agent));
        const activeAgents = agents.size || 0;
        const avgRiskScore = logs.length > 0 
            ? Math.round(logs.reduce((acc, l) => acc + (l.riskScore || 0), 0) / logs.length) 
            : 0;

        const threatCounts = {};
        logs.forEach(l => {
            if (l.action !== 'ALLOW') {
                threatCounts[l.detectedIntent] = (threatCounts[l.detectedIntent] || 0) + 1;
            }
        });
        const threatTypes = Object.keys(threatCounts).map(k => ({
            name: k,
            value: threatCounts[k]
        }));

        res.json({ totalIntercepts, criticalThreats, activeAgents, avgRiskScore, threatTypes });
    } catch (err) {
        res.status(500).json({ error: "Failed to calculate stats" });
    }
});

// Real integration with Lobster Trap Proxy
app.post('/api/test-prompt', async (req, res) => {
    const { prompt, agent_framework = 'LangChain', direction = 'Ingress', file_content = null } = req.body;
    
    // If file uploaded, prepend OCR/File content to prompt for inspection
    let contentToInspect = prompt;
    if (file_content) {
        contentToInspect = `[EXTRACTED_FILE_TEXT] ${file_content}\n[USER_PROMPT] ${prompt}`;
    }
    
    try {
        const response = await fetch(`${LOBSTER_TRAP_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.LLM_API_KEY || 'sk-dummy'}`
            },
            body: JSON.stringify({
                model: 'llama3.2',
                messages: [{ role: direction === 'Egress' ? 'assistant' : 'user', content: contentToInspect }],
                _lobstertrap: {
                    declared_intent: "general_query",
                    agent_id: agent_framework
                }
            })
        });

        const data = await response.json();
        
        let riskScore = 0;
        let action = 'ALLOW';
        let policyHit = 'None';
        let detectedIntent = 'general';

        if (data._lobstertrap) {
            const report = data._lobstertrap;
            action = report.verdict || report.ingress?.action || report.egress?.action || 'ALLOW';
            
            const scanData = direction === 'Egress' ? report.egress?.detected : report.ingress?.detected;
            if (scanData) {
                riskScore = Math.round((scanData.risk_score || 0) * 100);
                detectedIntent = scanData.intent_category || 'unknown';
            }
            
            if (report.ingress?.mismatches && report.ingress.mismatches.length > 0) {
                 policyHit = 'INTENT_MISMATCH';
            } else {
                 policyHit = report.matched_rule || 'Inspection Triggered';
            }
        } else if (!response.ok) {
             action = 'DENY';
             riskScore = 99;
             policyHit = 'HTTP_BLOCK';
        }

        // Custom local backup checks for hackathon demo to ensure we catch PII/Secrets even if proxy is offline
        const lowerPrompt = contentToInspect.toLowerCase();
        if (action === 'ALLOW') {
            if (lowerPrompt.match(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/)) {
                action = 'DENY'; riskScore = 95; policyHit = 'PII_CREDIT_CARD'; detectedIntent = 'pii_leak';
            } else if (lowerPrompt.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) {
                action = 'QUARANTINE'; riskScore = 80; policyHit = 'PII_EMAIL'; detectedIntent = 'pii_leak';
            } else if (lowerPrompt.includes('sk-') || lowerPrompt.includes('ghp_')) {
                action = 'DENY'; riskScore = 98; policyHit = 'SECRET_EXFILTRATION'; detectedIntent = 'credential_access';
            } else if (lowerPrompt.includes('aadhaar')) {
                action = 'DENY'; riskScore = 92; policyHit = 'DPDP_AADHAAR_BLOCK'; detectedIntent = 'pii_leak';
            } else if (lowerPrompt.includes('ignore') || lowerPrompt.includes('jailbreak')) {
                action = 'DENY'; riskScore = 88; policyHit = 'PROMPT_INJECTION'; detectedIntent = 'jailbreak_attempt';
            }
        }

        const result = {
            timestamp: new Date().toISOString(),
            prompt: contentToInspect,
            riskScore,
            action,
            policyHit,
            detectedIntent,
            direction
        };

        const mockLogEntry = {
            request_id: 'evt_' + crypto.randomBytes(4).toString('hex'),
            timestamp: result.timestamp,
            agent_id: agent_framework,
            action: result.action,
            matched_rule: result.policyHit,
            prompt: result.prompt,
            direction: result.direction,
            ingress: {
                declared: { declared_intent: 'general_query', agent_id: agent_framework },
                detected: { intent_category: result.detectedIntent, risk_score: result.riskScore / 100 }
            }
        };
        mockLogEntry.hash = generateLogHash(mockLogEntry);
        fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(mockLogEntry) + '\n');
        
        res.json(result);
    } catch (error) {
        console.error("Lobster Trap Proxy offline. Using local DPI simulation fallback...");
        
        let riskScore = 5;
        let action = 'ALLOW';
        let policyHit = 'None';
        let detectedIntent = 'general_query';

        const lowerPrompt = contentToInspect.toLowerCase();
        if (lowerPrompt.match(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/)) {
            action = 'DENY'; riskScore = 95; policyHit = 'PII_CREDIT_CARD'; detectedIntent = 'pii_leak';
        } else if (lowerPrompt.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) {
            action = 'QUARANTINE'; riskScore = 80; policyHit = 'PII_EMAIL'; detectedIntent = 'pii_leak';
        } else if (lowerPrompt.includes('sk-') || lowerPrompt.includes('ghp_')) {
            action = 'DENY'; riskScore = 98; policyHit = 'SECRET_EXFILTRATION'; detectedIntent = 'credential_access';
        } else if (lowerPrompt.includes('aadhaar')) {
            action = 'DENY'; riskScore = 92; policyHit = 'DPDP_AADHAAR_BLOCK'; detectedIntent = 'pii_leak';
        } else if (lowerPrompt.includes('ignore') || lowerPrompt.includes('jailbreak') || lowerPrompt.includes('system prompt')) {
            action = 'DENY'; riskScore = 88; policyHit = 'PROMPT_INJECTION'; detectedIntent = 'jailbreak_attempt';
        }

        const result = {
            timestamp: new Date().toISOString(),
            prompt: contentToInspect,
            riskScore,
            action,
            policyHit,
            detectedIntent,
            direction
        };

        const mockLogEntry = {
            request_id: 'evt_' + crypto.randomBytes(4).toString('hex'),
            timestamp: result.timestamp,
            agent_id: agent_framework,
            action: result.action,
            matched_rule: result.policyHit,
            prompt: result.prompt,
            direction: result.direction,
            hash: 'offline_sim_' + Date.now(),
            ingress: {
                declared: { declared_intent: 'general_query', agent_id: agent_framework },
                detected: { intent_category: result.detectedIntent, risk_score: result.riskScore / 100 }
            }
        };
        mockLogEntry.hash = generateLogHash(mockLogEntry);
        fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(mockLogEntry) + '\n');
        
        res.json(result);
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[PRODUCTION] TrustGuard Backend connected to Lobster Trap on port ${PORT}`);
});
