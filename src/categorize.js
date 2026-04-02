/**
 * Categorize a proxy check error into a known type.
 */
function categorizeError(error) {
  const msg = (error.message || String(error)).toLowerCase();
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('etimedout')) return 'TIMEOUT';
  if (msg.includes('econnrefused')) return 'CONN_REFUSED';
  if (msg.includes('407') || msg.includes('auth')) return 'AUTH_FAILED';
  return 'OTHER';
}

module.exports = { categorizeError };
