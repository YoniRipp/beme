const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Metro must watch the monorepo root so changes in packages/shared trigger a rebuild.
config.watchFolders = [monorepoRoot];

// Resolve from the app first, then the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Without this Metro walks up and can load two copies of React.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
