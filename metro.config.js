const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force single-process transforms to avoid child_process.fork EPERM on Windows
config.maxWorkers = 1;

// Source map policy:
// Metro does NOT include source maps in production bundles by default.
// `expo export --platform web` uses --no-dev mode, which excludes inline
// source maps from the output bundle. External .map files are only generated
// when `--source-maps` is explicitly passed to expo export — never do this
// for production deployments of this app (patient PII and financial data).
// In development mode (`expo start --web`) source maps are enabled as expected.

module.exports = config;
