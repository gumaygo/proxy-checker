/**
 * Detect proxy anonymity level based on response headers.
 * @param {Object} headers - Response headers from the target
 * @param {string} realIP - The user's real IP address
 * @returns {'Elite' | 'Anonymous' | 'Transparent'}
 */
function detectAnonymity(headers, realIP) {
  const proxyHeaders = ['Via', 'X-Forwarded-For', 'X-Proxy-Id', 'Proxy-Connection', 'Forwarded'];
  const hasProxyHeader = proxyHeaders.some(h => headers[h] || headers[h.toLowerCase()]);
  const xff = headers['X-Forwarded-For'] || headers['x-forwarded-for'] || '';

  if (xff.includes(realIP) && realIP !== '') {
    return 'Transparent';
  }
  if (hasProxyHeader) {
    return 'Anonymous';
  }
  return 'Elite';
}

module.exports = { detectAnonymity };
