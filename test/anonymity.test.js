const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { detectAnonymity } = require('../src/anonymity');

describe('detectAnonymity', () => {
  test('returns Elite when no proxy headers are present', () => {
    const headers = { 'Content-Type': 'application/json' };
    assert.equal(detectAnonymity(headers, '1.2.3.4'), 'Elite');
  });

  test('returns Transparent when X-Forwarded-For contains real IP', () => {
    const headers = { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' };
    assert.equal(detectAnonymity(headers, '1.2.3.4'), 'Transparent');
  });

  test('returns Anonymous when proxy headers exist but no real IP leak', () => {
    const headers = { 'Via': '1.1 proxy.example.com' };
    assert.equal(detectAnonymity(headers, '1.2.3.4'), 'Anonymous');
  });

  test('returns Anonymous for lowercase x-forwarded-for without real IP', () => {
    const headers = { 'x-forwarded-for': '5.6.7.8' };
    assert.equal(detectAnonymity(headers, '1.2.3.4'), 'Anonymous');
  });

  test('returns Elite when real IP is empty string', () => {
    const headers = { 'X-Forwarded-For': '' };
    assert.equal(detectAnonymity(headers, ''), 'Elite');
  });

  test('detects Forwarded header as Anonymous', () => {
    const headers = { 'Forwarded': 'for=5.6.7.8' };
    assert.equal(detectAnonymity(headers, '1.2.3.4'), 'Anonymous');
  });
});
