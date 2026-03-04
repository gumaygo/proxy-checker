# Proxy Checker & Validator

A Node.js application to check and validate proxy servers.

## Features

- **High Performance:** Concurrent checking (multi-threaded) for faster results
- **Progress Tracking:** Real-time progress updates in the console
- Reads proxy list from `data/proxies.txt`
- Tests proxy connection to `https://httpbin.org/ip`
- Shows proxy status (Alive/Dead)
- Displays response time and detected IP for working proxies
- Saves results to `data/results.txt`
- Supports multiple proxy protocols (HTTP, HTTPS, SOCKS4, SOCKS5)

## Installation

1. Make sure you have Node.js installed
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

## Usage

1. Add your proxies to `data/proxies.txt` (one proxy per line)
2. Run the checker:
```bash
npm start
```

## Supported Proxy Formats

The following proxy formats are supported:

1. Basic format (no protocol):
```
192.168.1.1:8080
```
Program will try HTTPS first, then SOCKS5

2. HTTP proxy:
```
http://192.168.1.1:8080
```

3. HTTPS proxy:
```
https://192.168.1.1:8080
```

4. SOCKS proxy:
```
socks://192.168.1.1:1080
socks4://192.168.1.1:1080
socks5://192.168.1.1:1080
```

See `data/example-proxies.txt` for more examples.

## Output Format

Results will be saved to `data/results.txt` in the following format:
- For working proxies: `✅ proxy_ip:port (protocol) - Alive - detected_ip - response_time ms`
- For dead proxies: `❌ proxy_ip:port - Dead`

Example output:
```
✅ 192.168.1.1:8080 (https) - Alive - 123.45.67.89 - 500 ms
✅ 192.168.1.2:1080 (socks5) - Alive - 123.45.67.90 - 600 ms
❌ 192.168.1.3:8080 - Dead
```

## Configuration

You can modify the following settings in `index.js`:
- `CONCURRENCY`: Number of simultaneous checks (default: 10)
- `TARGET_URL`: The URL to test proxies against (default: https://httpbin.org/ip)
- `TIMEOUT`: Connection timeout in milliseconds (default: 7000) 
 