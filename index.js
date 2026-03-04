const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const cliProgress = require('cli-progress');
const { table } = require('table');

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const PROXY_FILE = path.join(DATA_DIR, 'proxies.txt');
const RESULTS_TXT = path.join(DATA_DIR, 'results.txt');
const RESULTS_CSV = path.join(DATA_DIR, 'results.csv');
const RESULTS_JSON = path.join(DATA_DIR, 'results.json');

const TARGET_URL = 'https://httpbin.org/get';
const TIMEOUT = 7000;
const CONCURRENCY = 10;

let realIP = '';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Fetch real IP for transparency check
async function getRealIP() {
    try {
        const response = await fetch('https://httpbin.org/ip');
        const data = await response.json();
        realIP = data.origin;
    } catch (error) {
        console.error('Warning: Could not fetch real IP. Transparency check may be limited.');
    }
}

// Read proxies from file
const proxies = fs.readFileSync(PROXY_FILE, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && (line.includes(':') || line.includes('@')));

function parseProxy(proxyString) {
    let protocol = null;
    let auth = null;
    let host = '';
    let port = '';

    let remaining = proxyString;

    if (remaining.includes('://')) {
        [protocol, remaining] = remaining.split('://');
    }

    if (remaining.includes('@')) {
        [auth, remaining] = remaining.split('@');
    }

    if (remaining.includes(':')) {
        [host, port] = remaining.split(':');
    } else {
        host = remaining;
    }

    return { protocol, auth, host, port };
}

function createProxyAgent(proxyInfo) {
    const { protocol, auth, host, port } = proxyInfo;
    const authPrefix = auth ? `${auth}@` : '';
    const proxyUrl = `${protocol || 'http'}://${authPrefix}${host}:${port}`;
    
    if (protocol && protocol.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl);
    }
    
    return new HttpsProxyAgent(proxyUrl);
}

async function tryProxy(proxyInfo, startTime) {
    const agent = createProxyAgent(proxyInfo);
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(TARGET_URL, {
            agent,
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        // Detect Anonymity
        let anonymity = 'Elite';
        const headers = data.headers || {};
        const proxyHeaders = [
            'Via', 
            'X-Forwarded-For', 
            'X-Proxy-Id', 
            'Proxy-Connection', 
            'Forwarded'
        ];

        const hasProxyHeader = proxyHeaders.some(h => headers[h] || headers[h.toLowerCase()]);
        const xff = headers['X-Forwarded-For'] || headers['x-forwarded-for'] || '';
        
        if (xff.includes(realIP) && realIP !== '') {
            anonymity = 'Transparent';
        } else if (hasProxyHeader) {
            anonymity = 'Anonymous';
        }
        
        return { 
            success: true, 
            ip: data.origin,
            responseTime,
            protocol: proxyInfo.protocol || 'https',
            anonymity
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function checkProxy(proxyString) {
    const proxyInfo = parseProxy(proxyString);
    const startTime = Date.now();
    
    if (proxyInfo.protocol) {
        return await tryProxy(proxyInfo, startTime);
    }
    
    // Fallback: Try HTTPS then SOCKS5
    try {
        const httpsResult = await tryProxy({ ...proxyInfo, protocol: 'https' }, startTime);
        if (httpsResult.success) return httpsResult;
        
        return await tryProxy({ ...proxyInfo, protocol: 'socks5' }, startTime);
    } catch (error) {
        return { success: false, error };
    }
}

async function saveResults(results) {
    // 1. Save TXT
    const txtContent = results.map(r => 
        r.success 
            ? `[ALIVE] ${r.proxy} (${r.protocol}) - [${r.anonymity}] - IP: ${r.ip} - ${r.responseTime}ms`
            : `[DEAD] ${r.proxy}`
    ).join('\n');
    fs.writeFileSync(RESULTS_TXT, txtContent);

    // 2. Save CSV
    const csvHeader = 'proxy,status,protocol,anonymity,ip,responseTime,error\n';
    const csvContent = results.map(r => 
        `"${r.proxy}","${r.success ? 'Alive' : 'Dead'}","${r.protocol || ''}","${r.anonymity || ''}","${r.ip || ''}","${r.responseTime || ''}","${r.error || ''}"`
    ).join('\n');
    fs.writeFileSync(RESULTS_CSV, csvHeader + csvContent);

    // 3. Save JSON
    fs.writeFileSync(RESULTS_JSON, JSON.stringify(results, null, 2));
}

async function main() {
    console.log('--- Proxy Checker ---');
    await getRealIP();
    console.log(`Real IP: ${realIP || 'Unknown'}`);
    console.log(`Proxies: ${proxies.length}`);
    console.log(`Threads: ${CONCURRENCY}\n`);

    const results = [];
    const queue = [...proxies];
    const progressBar = new cliProgress.SingleBar({
        format: 'Progress | {bar} | {percentage}% | {value}/{total} Proxies',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    progressBar.start(proxies.length, 0);

    async function worker() {
        while (queue.length > 0) {
            const proxy = queue.shift();
            if (!proxy) continue;

            const res = await checkProxy(proxy);
            results.push({ proxy, ...res });
            progressBar.increment();
        }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, proxies.length) }, () => worker());
    await Promise.all(workers);
    
    progressBar.stop();
    await saveResults(results);

    // Display Summary Table
    const summaryData = [
        ['Status', 'Proxy', 'Anonymity', 'Protocol', 'IP', 'Latency']
    ];

    const alive = results.filter(r => r.success);
    alive.slice(0, 10).forEach(r => {
        summaryData.push(['ALIVE', r.proxy, r.anonymity, r.protocol, r.ip, `${r.responseTime}ms`]);
    });

    if (alive.length > 10) {
        summaryData.push(['...', '...', '...', '...', '...', '...']);
    }

    console.log('\n--- Results Summary (Top 10) ---');
    console.log(table(summaryData));
    
    console.log(`Total Alive: ${alive.length}`);
    console.log(`Total Dead:  ${results.length - alive.length}`);
    console.log(`\nExports: txt, csv, json saved in /data directory.`);
}

main().catch(console.error); 