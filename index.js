const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Configuration
const PROXY_FILE = path.join(__dirname, 'data', 'proxies.txt');
const RESULTS_FILE = path.join(__dirname, 'data', 'results.txt');
const TARGET_URL = 'https://httpbin.org/ip';
const TIMEOUT = 7000; // 7 seconds
const CONCURRENCY = 10; // Number of simultaneous checks 


// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Read proxies from file
const proxies = fs.readFileSync(PROXY_FILE, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes(':'));

// Clear previous results
fs.writeFileSync(RESULTS_FILE, '');

function parseProxy(proxyString) {
    let protocol = null;
    let auth = null;
    let host = '';
    let port = '';

    let remaining = proxyString;

    // 1. Extract protocol if present
    if (remaining.includes('://')) {
        [protocol, remaining] = remaining.split('://');
    }

    // 2. Extract auth if present (user:pass@host:port)
    if (remaining.includes('@')) {
        [auth, remaining] = remaining.split('@');
    }

    // 3. Extract host and port
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
    
    // Default to HTTPS proxy for http/https protocols
    return new HttpsProxyAgent(proxyUrl);
}

async function checkProxy(proxyString) {
    const proxyInfo = parseProxy(proxyString);
    const startTime = Date.now();
    
    // If protocol is specified, only try that protocol
    if (proxyInfo.protocol) {
        return await tryProxy(proxyInfo, startTime);
    }
    
    // If no protocol specified, try both HTTP and SOCKS
    try {
        // Try HTTPS first
        const httpsResult = await tryProxy({ ...proxyInfo, protocol: 'https' }, startTime);
        if (httpsResult.success) return httpsResult;
        
        // If HTTPS fails, try SOCKS5
        return await tryProxy({ ...proxyInfo, protocol: 'socks5' }, startTime);
    } catch (error) {
        return { success: false, error };
    }
}

async function tryProxy(proxyInfo, startTime) {
    const agent = createProxyAgent(proxyInfo);
    const { host, port, protocol } = proxyInfo;
    
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
        const protoLabel = protocol ? ` (${protocol})` : '';
        
        return { 
            success: true, 
            info: `✅ ${host}:${port}${protoLabel} - Alive - ${data.origin} - ${responseTime} ms`
        };
    } catch (error) {
        return { success: false, error };
    }
}

async function main() {
    console.log('Starting proxy checker...');
    console.log(`Found ${proxies.length} proxies to check`);
    console.log(`Concurrency: ${CONCURRENCY} threads\n`);

    const queue = [...proxies];
    const total = proxies.length;
    let completed = 0;

    async function worker() {
        while (queue.length > 0) {
            const proxy = queue.shift();
            if (!proxy) continue;

            const result = await checkProxy(proxy);
            completed++;
            
            let logMsg = '';
            if (result.success) {
                logMsg = result.info;
            } else {
                logMsg = `❌ ${proxy} - Dead`;
            }
            
            fs.appendFileSync(RESULTS_FILE, logMsg + '\n');
            console.log(`[${completed}/${total}] ${logMsg}`);
        }
    }

    // Create and start workers
    const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());

    await Promise.all(workers);

    console.log('\nProxy checking completed!');
    console.log(`Results saved to: ${RESULTS_FILE}`);
}

main().catch(console.error); 