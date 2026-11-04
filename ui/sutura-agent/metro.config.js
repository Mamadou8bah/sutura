const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Each app owns its transform cache so parallel exports cannot clear one another.
config.cacheStores = [new (require("metro-cache").FileStore)({ root: require("path").join(__dirname, ".expo", "metro-cache") })];
module.exports = config;
