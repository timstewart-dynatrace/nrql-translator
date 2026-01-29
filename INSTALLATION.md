# Installation

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- For Dynatrace App: Access to a Dynatrace tenant with app development enabled

## CLI Library Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/timstewart-dynatrace/nrql-translator.git
   cd nrql-translator/nrql-translator
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

### Verify Installation

```bash
npm run cli -- --help
```

Expected output:
```
Usage: nrql-translator [options] [command]

NRQL to DQL translation tools

Options:
  -V, --version       output the version number
  -h, --help          display help for command

Commands:
  excel <input>       Process Excel file with NRQL queries
  help [command]      display help for command
```

## Dynatrace App Installation

### Development Setup

1. Navigate to the app directory:
   ```bash
   cd nrql-translator-app/nrql-translator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run start
   ```

4. Open the provided URL in your browser to test locally.

### Deploy to Tenant

1. Ensure you're logged into your Dynatrace tenant:
   ```bash
   npx dt-app login
   ```

2. Deploy the app:
   ```bash
   npm run deploy
   ```

3. Access the app from your Dynatrace tenant's Apps section.

## Configuration

### CLI Configuration

The CLI uses command-line arguments for configuration. See `npm run cli -- --help` for available options.

### App Configuration

The Dynatrace App configuration is in `app.config.json`:

```json
{
  "environmentUrl": "https://your-tenant.apps.dynatrace.com/",
  "app": {
    "id": "my.nrql.translator",
    "name": "NRQL to DQL Translator",
    "version": "1.0.2"
  }
}
```

Update `environmentUrl` to match your Dynatrace tenant URL.

## Troubleshooting

### Build Errors

If you encounter TypeScript errors during build:

```bash
npm run clean
npm install
npm run build
```

### Permission Errors (macOS/Linux)

If you get permission errors:

```bash
chmod +x node_modules/.bin/*
```

### App Deployment Issues

1. Verify tenant URL is correct in `app.config.json`
2. Ensure you have app development permissions in your tenant
3. Check that you're logged in: `npx dt-app whoami`
