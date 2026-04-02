const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { formatResultsTxt, formatResultsCsv, getAliveProxies, getEliteProxies } = require('../src/exporter');

const mockResults = [
  { proxy: '1.1.1.1:8080', success: true, protocol: 'http', anonymity: 'Elite', location: 'US - NYC', isp: 'ISP1', ip: '1.1.1.1', responseTime: 150 },
  { proxy: '2.2.2.2:8080', success: true, protocol: 'http', anonymity: 'Anonymous', location: 'DE - Berlin', isp: 'ISP2', ip: '2.2.2.2', responseTime: 300 },
  { proxy: '3.3.3.3:8080', success: false, errorType: 'TIMEOUT' },
  { proxy: '4.4.4.4:8080', success: true, protocol: 'socks5', anonymity: 'Elite', location: 'JP - Tokyo', isp: 'ISP3', ip: '4.4.4.4', responseTime: 200 }
];

describe('formatResultsTxt', () => {
  test('formats alive proxies with details', () => {
    const txt = formatResultsTxt(mockResults);
    assert.ok(txt.includes('[ALIVE] 1.1.1.1:8080'));
    assert.ok(txt.includes('[Elite]'));
    assert.ok(txt.includes('150ms'));
  });

  test('formats dead proxies with error type', () => {
    const txt = formatResultsTxt(mockResults);
    assert.ok(txt.includes('[DEAD] 3.3.3.3:8080 [TIMEOUT]'));
  });
});

describe('formatResultsCsv', () => {
  test('includes CSV header', () => {
    const csv = formatResultsCsv(mockResults);
    assert.ok(csv.startsWith('proxy,status,protocol,anonymity,location,isp,ip,responseTime,errorType'));
  });

  test('includes all results as rows', () => {
    const csv = formatResultsCsv(mockResults);
    const lines = csv.split('\n');
    assert.equal(lines.length, 5); // header + 4 results
  });
});

describe('getAliveProxies', () => {
  test('returns only alive proxies sorted by latency', () => {
    const alive = getAliveProxies(mockResults);
    const lines = alive.split('\n');
    assert.equal(lines.length, 3);
    assert.equal(lines[0], '1.1.1.1:8080'); // fastest
    assert.equal(lines[1], '4.4.4.4:8080');
    assert.equal(lines[2], '2.2.2.2:8080'); // slowest
  });
});

describe('getEliteProxies', () => {
  test('returns only elite proxies', () => {
    const elite = getEliteProxies(mockResults);
    const lines = elite.split('\n');
    assert.equal(lines.length, 2);
    assert.ok(!elite.includes('2.2.2.2')); // Anonymous, not Elite
  });
});
