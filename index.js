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
    // Check if protocol is specified
    if (proxyString.startsWith('http://') || proxyString.startsWith('https://') || proxyString.startsWith('socks://') || proxyString.startsWith('socks4://') || proxyString.startsWith('socks5://')) {
        const [protocol, rest] = proxyString.split('://');
        const [ip, port] = rest.split(':');
        return { protocol, ip, port };
    }
    
    // If no protocol specified, return just IP and port
    const [ip, port] = proxyString.split(':');
    return { protocol: null, ip, port };
}

function createProxyAgent(proxyInfo) {
    const { protocol, ip, port } = proxyInfo;
    
    if (protocol === 'socks' || protocol === 'socks4' || protocol === 'socks5') {
        return new SocksProxyAgent(`${protocol}://${ip}:${port}`);
    }
    
    // Default to HTTPS proxy
    return new HttpsProxyAgent(`http://${ip}:${port}`);
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
        const protocol = proxyInfo.protocol ? ` (${proxyInfo.protocol})` : '';
        const result = `✅ ${proxyInfo.ip}:${proxyInfo.port}${protocol} - Alive - ${data.origin} - ${responseTime} ms\n`;
        fs.appendFileSync(RESULTS_FILE, result);
        console.log(result.trim());
        return { success: true };
    } catch (error) {
        return { success: false, error };
    }
}

async function main() {
    console.log('Starting proxy checker...');
    console.log(`Found ${proxies.length} proxies to check\n`);

    for (const proxy of proxies) {
        const result = await checkProxy(proxy);
        if (!result.success) {
            const result = `❌ ${proxy} - Dead\n`;
            fs.appendFileSync(RESULTS_FILE, result);
            console.log(result.trim());
        }
    }

    console.log('\nProxy checking completed!');
    console.log(`Results saved to: ${RESULTS_FILE}`);
}

main().catch(console.error); 