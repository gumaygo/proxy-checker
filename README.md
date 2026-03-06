# Proxy Checker

High-performance, concurrent proxy validator supporting multiple protocols and authentication.

## Key Features

- **Concurrent Validation**: High-speed checking using worker-pool pattern.
- **Interactive CLI**: Real-time progress bar with live alive proxy output.
- **Protocol Detection**: Supports HTTP, HTTPS, SOCKS4, and SOCKS5.
- **Proxy Authentication**: Full support for `user:password@ip:port` format.
- **Deduplication**: Automatically removes duplicate proxies before checking.
- **Retry Logic**: Retries on timeout before marking a proxy as dead.
- **Anonymity Detection**: Classifies proxies as Elite, Anonymous, or Transparent.
- **Error Categorization**: Differentiates Timeout, ConnRefused, AuthFailed, and Other failures.
- **Statistics**: Average latency, fastest proxy, and anonymity breakdown.
- **Multi-Format Export**: Saves results in TXT, CSV, JSON, `alive.txt`, and `elite.txt`.

## Installation

```bash
git clone https://github.com/gumaygo/proxy-checker.git
cd proxy-checker
npm install
```

## Usage

1. Add your proxies to `data/proxies.txt` (one per line).
2. Run the checker:

```bash
# Default settings
npm start

# Custom settings
node index.js --concurrency 20 --timeout 5000 --retry 2

# Short flags
node index.js -c 20 -t 5000 -r 2
```

## CLI Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--concurrency` | `-c` | `10` | Number of simultaneous checks |
| `--timeout` | `-t` | `7000` | Request timeout in milliseconds |
| `--retry` | `-r` | `1` | Retry count on timeout |
| `--target` | | `https://httpbin.org/get` | Validation endpoint |

## Supported Proxy Formats

- `192.168.1.1:8080` (Default HTTPS/SOCKS5 fallback)
- `user:pass@192.168.1.1:8080` (With authentication)
- `socks5://user:pass@192.168.1.1:1080` (Explicit protocol)

## Export Files

All results are saved to the `data/` directory:

| File | Description |
|------|-------------|
| `results.txt` | Full log (alive + dead with error types) |
| `alive.txt` | Alive proxies sorted by latency (fastest first) |
| `elite.txt` | Elite (fully anonymous) proxies only |
| `results.csv` | Compatible with Excel and data analysis tools |
| `results.json` | Ready for programmatic use |

## License

[MIT](LICENSE)
