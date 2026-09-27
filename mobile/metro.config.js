const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// file: workspace dependencies live outside the Expo app root. This repository
// has no workspace package globs, so Expo cannot infer their watch folders.
config.watchFolders = [...new Set([
  ...config.watchFolders,
  path.resolve(__dirname, "../packages"),
])];

module.exports = config;
