# Proxy Checker

High-performance, concurrent proxy validator supporting multiple protocols and authentication.

## Key Features

- **Concurrent Validation**: High-speed checking using worker-pool pattern.
- **Interactive CLI**: Real-time progress bar and summary table.
- **Protocol Detection**: Supports HTTP, HTTPS, SOCKS4, and SOCKS5.
- **Proxy Authentication**: Full support for `user:password@ip:port` format.
- **Multi-Format Export**: Saves results in TXT, CSV, and JSON formats for easy integration.

## Installation

```bash
# Clone the repository
git clone https://github.com/gumaygo/proxy-checker.git
cd proxy-checker

# Install dependencies
npm install
```

## Usage

1. Add your proxies to `data/proxies.txt` (one per line).
2. Run the checker:
```bash
npm start
```

## Supported Proxy Formats

The validator automatically parses various formats:
- `192.168.1.1:8080` (Default HTTPS/SOCKS5 fallback)
- `user:pass@192.168.1.1:8080` (With authentication)
- `socks5://user:pass@192.168.1.1:1080` (Explicit protocol)

## Export Formats

After execution, find your results in the `data/` directory:
- `results.txt`: Plain text log.
- `results.csv`: Compatible with Excel and data analysis tools.
- `results.json`: Ready for programmatic use.

## Configuration

Adjust settings in `index.js`:
- `CONCURRENCY`: Number of simultaneous checks.
- `TIMEOUT`: Request timeout in milliseconds.
- `TARGET_URL`: Validation endpoint (default: httpbin.org).

## License

[MIT](LICENSE)
