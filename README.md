# Proxy Checker

Proxy Checker is a concurrent CLI tool for validating large proxy lists, classifying anonymity level, and exporting results in multiple formats.

## Problem

Validating proxy lists manually is slow, noisy, and difficult to scale. Teams often need more than a simple alive-or-dead check. They need protocol detection, retry logic, latency measurements, and structured output they can use in downstream workflows.

## Solution

This project automates the validation pipeline by:

- checking proxies concurrently through a worker-pool model
- supporting HTTP, HTTPS, SOCKS4, and SOCKS5 flows
- handling authenticated proxies
- retrying timeout-based failures
- classifying anonymity levels
- exporting usable results for both humans and scripts

## Tech Stack

- Node.js
- `node-fetch`
- `https-proxy-agent`
- `socks-proxy-agent`
- `cli-progress`
- `table`
- `minimist`

## Key Features

- Concurrent validation for faster throughput
- Interactive CLI progress and alive-proxy logging
- Deduplication before execution
- Automatic protocol fallback when protocol is not specified
- Error categorization for timeout, connection refusal, authentication failure, and other failures
- Geo and ISP enrichment for successful checks
- Export support for TXT, CSV, JSON, `alive.txt`, and `elite.txt`

## How To Run

1. Install dependencies.

```bash
git clone https://github.com/gumaygo/proxy-checker.git
cd proxy-checker
npm install
```

2. Add proxy entries to `data/proxies.txt`.

3. Run the checker.

```bash
npm start
```

Use custom runtime settings when needed:

```bash
node index.js --concurrency 20 --timeout 5000 --retry 2
```

## CLI Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--concurrency` | `-c` | `10` | Number of simultaneous checks |
| `--timeout` | `-t` | `7000` | Request timeout in milliseconds |
| `--retry` | `-r` | `1` | Retry count on timeout |
| `--target` |  | `https://httpbin.org/get` | Validation endpoint |

## Sample Output

```text
--- Proxy Checker ---
Real IP     : 203.0.113.10
Proxies     : 250 (18 duplicates removed)
Concurrency : 20 | Timeout: 5000ms | Retry: 2x
Target      : https://httpbin.org/get

[ALIVE] 198.51.100.20:8080 (https) [Elite] US - Ashburn - 421ms
[ALIVE] socks5://203.0.113.8:1080 (socks5) [Anonymous] SG - Singapore - 538ms

Total Alive  : 67
Total Dead   : 183
Anonymity    : Elite=42 | Anonymous=19 | Transparent=6
Avg Latency  : 612ms | Fastest: 198.51.100.20:8080 (421ms)
Dead Reasons : Timeout=95 | ConnRefused=57 | AuthFailed=11 | Other=20
```

## Export Output

The run generates structured output in the `data/` folder:

- `results.txt` for the full log
- `alive.txt` for sorted alive proxies
- `elite.txt` for elite proxies only
- `results.csv` for spreadsheet analysis
- `results.json` for programmatic consumption

## Impact

- Speeds up large-batch proxy validation with concurrency
- Produces analyst-friendly and machine-friendly outputs in one run
- Demonstrates backend engineering strengths in reliability, observability, and tooling

## License

[MIT](LICENSE)
