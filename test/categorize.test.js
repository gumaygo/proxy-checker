const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { categorizeError } = require('../src/categorize');

describe('categorizeError', () => {
  test('categorizes timeout errors', () => {
    assert.equal(categorizeError(new Error('The operation was aborted')), 'TIMEOUT');
    assert.equal(categorizeError(new Error('request timeout')), 'TIMEOUT');
    assert.equal(categorizeError(new Error('ETIMEDOUT')), 'TIMEOUT');
  });

  test('categorizes connection refused errors', () => {
    assert.equal(categorizeError(new Error('connect ECONNREFUSED 127.0.0.1:8080')), 'CONN_REFUSED');
  });

  test('categorizes auth failed errors', () => {
    assert.equal(categorizeError(new Error('407 Proxy Authentication Required')), 'AUTH_FAILED');
    assert.equal(categorizeError(new Error('proxy auth failed')), 'AUTH_FAILED');
  });

  test('categorizes unknown errors as OTHER', () => {
    assert.equal(categorizeError(new Error('something went wrong')), 'OTHER');
    assert.equal(categorizeError(new Error('')), 'OTHER');
  });

  test('handles non-Error objects', () => {
    assert.equal(categorizeError('timeout error string'), 'TIMEOUT');
    assert.equal(categorizeError({ message: 'ECONNREFUSED' }), 'CONN_REFUSED');
  });
});
