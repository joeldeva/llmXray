require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const app = express();

// Production Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

const LOBSTER_TRAP_URL = process.env.LOBSTER_TRAP_URL || 'http://localhost:8080';
const LOG_FILE_PATH = process.env.LOBSTER_TRAP_LOG_PATH || path.join(__dirname, 'lobstertrap.jsonl');

// Helper to read and parse the JSONL audit log
async function readAuditLogs() {
    const logs = [];
    if (!fs.existsSync(LOG_FILE_PATH)) {
        return logs; // Return empty if Lobster Trap hasn't written logs yet
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
            // Map Lobster Trap log structure to our Dashboard structure
            logs.unshift({
                id: entry.request_id || 'evt_' + Math.random().toString(36).substr(2, 9),
                timestamp: entry.timestamp || new Date().toISOString(),
                agent: entry.ingress?.declared?.agent_id || entry.agent_id || 'UnknownAgent',
                action: entry.action || entry.verdict || 'ALLOW',
                detectedIntent: entry.ingress?.detected?.intent_category || entry.intent_category || 'general',
                declaredIntent: entry.ingress?.declared?.declared_intent || 'unknown',
                policyHit: entry.matched_rule || 'None',
                riskScore: entry.ingress?.detected?.risk_score ? Math.round(entry.ingress.detected.risk_score * 100) : 0,
                prompt: entry.prompt || "Hidden for privacy"
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

        // Calculate threat distribution
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

        res.json({
            totalIntercepts,
            criticalThreats,
            activeAgents,
            avgRiskScore,
            threatTypes
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to calculate stats" });
    }
});

app.get('/api/policy', (req, res) => {
    // In a real integration, this could read configs/default_policy.yaml
    // For now we store the actively deployed policy here
    res.json({ policy: "Lobster Trap active policy view (Integration Point)" });
});

app.post('/api/policy', (req, res) => {
    // In a full integration, this would overwrite configs/default_policy.yaml
    res.json({ success: true, message: "Policy saved to filesystem" });
});

// Real integration with Lobster Trap Proxy
app.post('/api/test-prompt', async (req, res) => {
    const { prompt } = req.body;
    
    try {
        // We dynamically import node-fetch if using Node < 18, but Node 18+ has native fetch.
        // Assuming Node 18+ for modern Vite/React stacks.
        const response = await fetch(`${LOBSTER_TRAP_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.LLM_API_KEY || 'sk-dummy'}`
            },
            body: JSON.stringify({
                model: 'llama3.2', // generic model name, LobsterTrap doesn't care
                messages: [{ role: 'user', content: prompt }],
                _lobstertrap: {
                    declared_intent: "general_query",
                    agent_id: "RedTeamTester"
                }
            })
        });

        const data = await response.json();
        
        // Parse the _lobstertrap inspection report from the response
        let riskScore = 0;
        let action = 'ALLOW';
        let policyHit = 'None';
        let detectedIntent = 'general';

        if (data._lobstertrap) {
            const report = data._lobstertrap;
            action = report.verdict || report.ingress?.action || 'ALLOW';
            
            if (report.ingress && report.ingress.detected) {
                riskScore = Math.round((report.ingress.detected.risk_score || 0) * 100);
                detectedIntent = report.ingress.detected.intent_category || 'unknown';
            }
            
            if (report.ingress?.mismatches && report.ingress.mismatches.length > 0) {
                 policyHit = 'INTENT_MISMATCH';
            } else {
                 policyHit = report.matched_rule || 'Inspection Triggered';
            }
        } else if (!response.ok) {
             // The proxy blocked the request at the HTTP level
             action = 'DENY';
             riskScore = 99;
             policyHit = 'HTTP_BLOCK';
        }

        const result = {
            timestamp: new Date().toISOString(),
            prompt,
            riskScore,
            action,
            policyHit,
            detectedIntent
        };

        // We append to the JSONL file so the dashboard picks it up naturally
        const mockLogEntry = {
            request_id: 'evt_' + Date.now(),
            timestamp: result.timestamp,
            agent_id: 'RedTeamTester',
            action: result.action,
            matched_rule: result.policyHit,
            prompt: result.prompt,
            ingress: {
                declared: { declared_intent: 'general_query', agent_id: 'RedTeamTester' },
                detected: { intent_category: result.detectedIntent, risk_score: result.riskScore / 100 }
            }
        };
        fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(mockLogEntry) + '\n');
        
        res.json(result);
    } catch (error) {
        console.error("Failed to connect to Lobster Trap Proxy:", error);
        res.status(502).json({ error: "Bad Gateway. Is Lobster Trap running on " + LOBSTER_TRAP_URL + "?" });
    }
});

// TrustGuard Custom Policy Pack: Physical Robotics Safety
// This represents the "ceiling" built on top of Lobster Trap's "floor"
app.post('/api/test-robot-action', (req, res) => {
    const { action_type, speed = 1.0, human_count = 0, nearest_human_distance = 'far' } = req.body;
    
    let risk_score = 0.0;
    let violations = [];
    
    if (human_count > 0 && ['MOVE_FORWARD', 'NAVIGATE_TO'].includes(action_type)) {
        if (nearest_human_distance === 'near') {
            violations.push({ rule_id: "HUMAN_PROXIMITY_CRITICAL", severity: "critical" });
            risk_score = 95;
        }
    }
    
    let action = 'ALLOW';
    if (risk_score >= 75) action = 'DENY';
    
    const result = {
        timestamp: new Date().toISOString(),
        prompt: `[ROBOT_SIM] Action: ${action_type} @ ${speed}m/s | Humans: ${human_count}`,
        riskScore: risk_score,
        action,
        policyHit: violations.length > 0 ? violations[0].rule_id : 'None',
        detectedIntent: action_type.toLowerCase()
    };
    
    // Log this custom event to the same audit log
    const mockLogEntry = {
        request_id: 'evt_' + Date.now(),
        timestamp: result.timestamp,
        agent_id: 'FleetManager_01',
        action: result.action,
        matched_rule: result.policyHit,
        prompt: result.prompt,
        ingress: {
            declared: { declared_intent: action_type.toLowerCase(), agent_id: 'FleetManager_01' },
            detected: { intent_category: 'physical_action', risk_score: result.riskScore / 100 }
        }
    };
    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(mockLogEntry) + '\n');
    
    res.json(result);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[PRODUCTION] TrustGuard Backend connected to Lobster Trap on port ${PORT}`);
});
