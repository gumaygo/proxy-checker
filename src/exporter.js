const fs = require('fs');
const path = require('path');

/**
 * Format results into different export formats.
 */
function formatResultsTxt(results) {
  return results.map(r =>
    r.success
      ? `[ALIVE] ${r.proxy} (${r.protocol}) - [${r.anonymity}] - ${r.location} - ${r.isp} - IP: ${r.ip} - ${r.responseTime}ms`
      : `[DEAD] ${r.proxy} [${r.errorType || 'OTHER'}]`
  ).join('\n');
}

function formatResultsCsv(results) {
  const header = 'proxy,status,protocol,anonymity,location,isp,ip,responseTime,errorType\n';
  const rows = results.map(r =>
    `"${r.proxy}","${r.success ? 'Alive' : 'Dead'}","${r.protocol || ''}","${r.anonymity || ''}","${r.location || ''}","${r.isp || ''}","${r.ip || ''}","${r.responseTime || ''}","${r.errorType || ''}"`
  ).join('\n');
  return header + rows;
}

function getAliveProxies(results) {
  return results
    .filter(r => r.success)
    .sort((a, b) => a.responseTime - b.responseTime)
    .map(r => r.proxy)
    .join('\n');
}

function getEliteProxies(results) {
  return results
    .filter(r => r.success && r.anonymity === 'Elite')
    .sort((a, b) => a.responseTime - b.responseTime)
    .map(r => r.proxy)
    .join('\n');
}

/**
 * Save all export formats to the data directory.
 */
function saveResults(results, dataDir) {
  fs.writeFileSync(path.join(dataDir, 'results.txt'), formatResultsTxt(results));
  fs.writeFileSync(path.join(dataDir, 'alive.txt'), getAliveProxies(results));
  fs.writeFileSync(path.join(dataDir, 'elite.txt'), getEliteProxies(results));
  fs.writeFileSync(path.join(dataDir, 'results.csv'), formatResultsCsv(results));
  fs.writeFileSync(path.join(dataDir, 'results.json'), JSON.stringify(results, null, 2));
}

module.exports = { formatResultsTxt, formatResultsCsv, getAliveProxies, getEliteProxies, saveResults };
