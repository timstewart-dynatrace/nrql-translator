# Installation

> **DISCLAIMER**: This is an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

## From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/timstewart-dynatrace/nrql-translator.git
   cd nrql-translator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the library:
   ```bash
   npm run build
   ```

4. Build the CLI:
   ```bash
   npm run build:cli
   ```

5. Run tests to verify:
   ```bash
   npm test
   ```

## Verify Installation

```bash
npm run cli -- --help
```

## Dynatrace App

The Dynatrace App UI is in a separate repo: [nrql-translator-app](https://github.com/timstewart-dynatrace/nrql-translator-app)

## Configuration

The CLI uses command-line arguments for configuration. See `npm run cli -- --help` for available options.

## Troubleshooting

### Build Errors

```bash
rm -rf dist dist-cli
npm install
npm run build
```

### Permission Errors (macOS/Linux)

```bash
chmod +x node_modules/.bin/*
```
