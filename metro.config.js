const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force single-process transforms to avoid child_process.fork EPERM on Windows
config.maxWorkers = 1;

module.exports = config;
