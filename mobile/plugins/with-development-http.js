const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withDevelopmentHttp(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const application = androidConfig.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error("CITYWALK could not configure Android development networking.");
    }
    application.$["android:usesCleartextTraffic"] = "true";
    return androidConfig;
  });
};
