const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const cliProgress = require('cli-progress');
const { table } = require('table');
const minimist = require('minimist');

// CLI Arguments
const argv = minimist(process.argv.slice(2), {
    default: {
        concurrency: 10,
        timeout: 7000,
        target: 'https://httpbin.org/get',
        retry: 1
    },
    alias: { c: 'concurrency', t: 'timeout', r: 'retry' }
});

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const PROXY_FILE = path.join(DATA_DIR, 'proxies.txt');

const TARGET_URL = argv.target;
const TIMEOUT = parseInt(argv.timeout);
const CONCURRENCY = parseInt(argv.concurrency);
const RETRY = parseInt(argv.retry);

let realIP = '';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

async function getRealIP() {
    try {
        const response = await fetch('https://httpbin.org/ip');
        const data = await response.json();
        realIP = data.origin;
    } catch (error) {
        console.error('Warning: Could not fetch real IP. Transparency check may be limited.');
    }
}

// Read & deduplicate proxies
const rawProxies = fs.readFileSync(PROXY_FILE, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && (line.includes(':') || line.includes('@')));

const proxies = [...new Set(rawProxies)];
const duplicatesRemoved = rawProxies.length - proxies.length;

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

async function getGeoInfo(ip) {
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,isp`);
        const data = await response.json();
        if (data.status === 'success') {
            return {
                location: `${data.countryCode} - ${data.city}`,
                isp: data.isp
            };
        }
    } catch (error) {
        // Silently fail
    }
    return { location: 'Unknown', isp: 'Unknown' };
}

function categorizeError(error) {
    const msg = (error.message || String(error)).toLowerCase();
    if (msg.includes('abort') || msg.includes('timeout') || msg.includes('etimedout')) return 'TIMEOUT';
    if (msg.includes('econnrefused')) return 'CONN_REFUSED';
    if (msg.includes('407') || msg.includes('auth')) return 'AUTH_FAILED';
    return 'OTHER';
}

async function tryProxy(proxyInfo, startTime) {
    const agent = createProxyAgent(proxyInfo);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(TARGET_URL, {
            agent,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - startTime;

        // Detect Anonymity
        let anonymity = 'Elite';
        const headers = data.headers || {};
        const proxyHeaders = ['Via', 'X-Forwarded-For', 'X-Proxy-Id', 'Proxy-Connection', 'Forwarded'];
        const hasProxyHeader = proxyHeaders.some(h => headers[h] || headers[h.toLowerCase()]);
        const xff = headers['X-Forwarded-For'] || headers['x-forwarded-for'] || '';

        if (xff.includes(realIP) && realIP !== '') {
            anonymity = 'Transparent';
        } else if (hasProxyHeader) {
            anonymity = 'Anonymous';
        }

        const geo = await getGeoInfo(data.origin);

        return {
            success: true,
            ip: data.origin,
            responseTime,
            protocol: proxyInfo.protocol || 'https',
            anonymity,
            location: geo.location,
            isp: geo.isp
        };
    } catch (error) {
        return { success: false, error: error.message, errorType: categorizeError(error) };
    }
}

async function checkProxy(proxyString) {
    const proxyInfo = parseProxy(proxyString);
    const startTime = Date.now();
    const attempts = RETRY + 1;

    async function attemptOnce() {
        if (proxyInfo.protocol) {
            return await tryProxy(proxyInfo, startTime);
        }
        // Fallback: Try HTTPS then SOCKS5
        const httpsResult = await tryProxy({ ...proxyInfo, protocol: 'https' }, startTime);
        if (httpsResult.success) return httpsResult;
        return await tryProxy({ ...proxyInfo, protocol: 'socks5' }, startTime);
    }

    let result;
    for (let i = 0; i < attempts; i++) {
        result = await attemptOnce();
        if (result.success) break;
        // Only retry on timeout
        if (result.errorType !== 'TIMEOUT') break;
    }
    return result;
}

async function saveResults(results) {
    const alive = results.filter(r => r.success).sort((a, b) => a.responseTime - b.responseTime);
    const dead = results.filter(r => !r.success);

    // results.txt - full log
    const txtContent = results.map(r =>
        r.success
            ? `[ALIVE] ${r.proxy} (${r.protocol}) - [${r.anonymity}] - ${r.location} - ${r.isp} - IP: ${r.ip} - ${r.responseTime}ms`
            : `[DEAD] ${r.proxy} [${r.errorType || 'OTHER'}]`
    ).join('\n');
    fs.writeFileSync(path.join(DATA_DIR, 'results.txt'), txtContent);

    // alive.txt - sorted by latency
    fs.writeFileSync(path.join(DATA_DIR, 'alive.txt'), alive.map(r => r.proxy).join('\n'));

    // elite.txt - elite proxies only
    const elite = alive.filter(r => r.anonymity === 'Elite');
    fs.writeFileSync(path.join(DATA_DIR, 'elite.txt'), elite.map(r => r.proxy).join('\n'));

    // results.csv
    const csvHeader = 'proxy,status,protocol,anonymity,location,isp,ip,responseTime,errorType\n';
    const csvContent = results.map(r =>
        `"${r.proxy}","${r.success ? 'Alive' : 'Dead'}","${r.protocol || ''}","${r.anonymity || ''}","${r.location || ''}","${r.isp || ''}","${r.ip || ''}","${r.responseTime || ''}","${r.errorType || ''}"`
    ).join('\n');
    fs.writeFileSync(path.join(DATA_DIR, 'results.csv'), csvHeader + csvContent);

    // results.json
    fs.writeFileSync(path.join(DATA_DIR, 'results.json'), JSON.stringify(results, null, 2));
}

async function main() {
    console.log('--- Proxy Checker ---');
    await getRealIP();
    console.log(`Real IP     : ${realIP || 'Unknown'}`);
    console.log(`Proxies     : ${proxies.length}${duplicatesRemoved > 0 ? ` (${duplicatesRemoved} duplicates removed)` : ''}`);
    console.log(`Concurrency : ${CONCURRENCY} | Timeout: ${TIMEOUT}ms | Retry: ${RETRY}x`);
    console.log(`Target      : ${TARGET_URL}\n`);

    const results = [];
    const queue = [...proxies];

    const multibar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: 'Progress | {bar} | {percentage}% | {value}/{total} Proxies'
    }, cliProgress.Presets.shades_classic);

    const bar = multibar.create(proxies.length, 0);

    async function worker() {
        while (queue.length > 0) {
            const proxy = queue.shift();
            if (!proxy) continue;

            const res = await checkProxy(proxy);
            results.push({ proxy, ...res });
            bar.increment();

            if (res.success) {
                multibar.log(`[ALIVE] ${proxy} (${res.protocol}) [${res.anonymity}] ${res.location} - ${res.responseTime}ms\n`);
            }
        }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, proxies.length) }, () => worker());
    await Promise.all(workers);

    multibar.stop();
    await saveResults(results);

    // Stats
    const alive = results.filter(r => r.success).sort((a, b) => a.responseTime - b.responseTime);
    const dead = results.filter(r => !r.success);
    const avgLatency = alive.length ? Math.round(alive.reduce((s, r) => s + r.responseTime, 0) / alive.length) : 0;
    const fastest = alive[0];

    const eliteCount = alive.filter(r => r.anonymity === 'Elite').length;
    const anonCount = alive.filter(r => r.anonymity === 'Anonymous').length;
    const transparentCount = alive.filter(r => r.anonymity === 'Transparent').length;

    const timeoutCount = dead.filter(r => r.errorType === 'TIMEOUT').length;
    const connRefusedCount = dead.filter(r => r.errorType === 'CONN_REFUSED').length;
    const authFailedCount = dead.filter(r => r.errorType === 'AUTH_FAILED').length;
    const otherCount = dead.filter(r => r.errorType === 'OTHER').length;

    // Summary Table (top 10 fastest alive)
    const summaryData = [['Status', 'Proxy', 'Anonymity', 'Location', 'ISP', 'Latency']];
    alive.slice(0, 10).forEach(r => {
        summaryData.push(['ALIVE', r.proxy, r.anonymity, r.location, r.isp, `${r.responseTime}ms`]);
    });
    if (alive.length > 10) {
        summaryData.push(['...', '...', '...', '...', '...', '...']);
    }

    console.log('\n--- Results Summary (Top 10 Fastest) ---');
    console.log(table(summaryData));

    console.log(`Total Alive  : ${alive.length}`);
    console.log(`Total Dead   : ${dead.length}`);
    console.log('');
    console.log(`Anonymity    : Elite=${eliteCount} | Anonymous=${anonCount} | Transparent=${transparentCount}`);
    console.log(`Avg Latency  : ${avgLatency}ms${fastest ? ` | Fastest: ${fastest.proxy} (${fastest.responseTime}ms)` : ''}`);
    if (dead.length > 0) {
        console.log(`Dead Reasons : Timeout=${timeoutCount} | ConnRefused=${connRefusedCount} | AuthFailed=${authFailedCount} | Other=${otherCount}`);
    }
    console.log('\nExports saved in /data:');
    console.log('  results.txt  - Full log');
    console.log('  alive.txt    - Alive proxies sorted by latency');
    console.log('  elite.txt    - Elite proxies only');
    console.log('  results.csv  - CSV format');
    console.log('  results.json - JSON format');
}

main().catch(console.error);
