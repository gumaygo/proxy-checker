const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { parseProxy, parseProxyList } = require('../src/parser');

describe('parseProxy', () => {
  test('parses host:port format', () => {
    const result = parseProxy('192.168.1.1:8080');
    assert.equal(result.host, '192.168.1.1');
    assert.equal(result.port, '8080');
    assert.equal(result.protocol, null);
    assert.equal(result.auth, null);
  });

  test('parses protocol://host:port format', () => {
    const result = parseProxy('http://10.0.0.1:3128');
    assert.equal(result.protocol, 'http');
    assert.equal(result.host, '10.0.0.1');
    assert.equal(result.port, '3128');
    assert.equal(result.auth, null);
  });

  test('parses socks5://host:port format', () => {
    const result = parseProxy('socks5://proxy.example.com:1080');
    assert.equal(result.protocol, 'socks5');
    assert.equal(result.host, 'proxy.example.com');
    assert.equal(result.port, '1080');
  });

  test('parses user:pass@host:port format', () => {
    const result = parseProxy('admin:secret@192.168.1.1:8080');
    assert.equal(result.auth, 'admin:secret');
    assert.equal(result.host, '192.168.1.1');
    assert.equal(result.port, '8080');
    assert.equal(result.protocol, null);
  });

  test('parses protocol://user:pass@host:port format', () => {
    const result = parseProxy('http://user:pass@10.0.0.1:3128');
    assert.equal(result.protocol, 'http');
    assert.equal(result.auth, 'user:pass');
    assert.equal(result.host, '10.0.0.1');
    assert.equal(result.port, '3128');
  });

  test('handles host-only input', () => {
    const result = parseProxy('proxy.example.com');
    assert.equal(result.host, 'proxy.example.com');
    assert.equal(result.port, '');
    assert.equal(result.protocol, null);
  });
});

describe('parseProxyList', () => {
  test('parses multi-line proxy list', () => {
    const content = '192.168.1.1:8080\n10.0.0.1:3128\n';
    const { proxies, duplicatesRemoved } = parseProxyList(content);
    assert.equal(proxies.length, 2);
    assert.equal(duplicatesRemoved, 0);
  });

  test('removes duplicates', () => {
    const content = '192.168.1.1:8080\n192.168.1.1:8080\n10.0.0.1:3128\n';
    const { proxies, duplicatesRemoved } = parseProxyList(content);
    assert.equal(proxies.length, 2);
    assert.equal(duplicatesRemoved, 1);
  });

  test('filters empty lines', () => {
    const content = '192.168.1.1:8080\n\n\n10.0.0.1:3128\n\n';
    const { proxies } = parseProxyList(content);
    assert.equal(proxies.length, 2);
  });

  test('returns empty array for empty input', () => {
    const { proxies } = parseProxyList('');
    assert.equal(proxies.length, 0);
  });
});
