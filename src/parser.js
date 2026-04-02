/**
 * Parse a proxy string into its components.
 * Supports formats: host:port, protocol://host:port, user:pass@host:port
 */
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

/**
 * Read proxy list from text content, deduplicate, and return unique entries.
 */
function parseProxyList(content) {
  const raw = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && (line.includes(':') || line.includes('@')));

  const unique = [...new Set(raw)];
  const duplicatesRemoved = raw.length - unique.length;

  return { proxies: unique, duplicatesRemoved };
}

module.exports = { parseProxy, parseProxyList };
