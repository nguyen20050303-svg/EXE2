const pluginModule = require("@howincodes/expo-dynamic-app-icon/app.plugin");
const withDynamicIcon = pluginModule.default || pluginModule;
const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withDisguiseIcons(config, props) {
  // Register this first so it runs after the dynamic icon plugin creates aliases.
  config = withAndroidManifest(config, (modConfig) => {
    const mainApp = modConfig.modResults?.manifest?.application?.[0];
    const aliases = mainApp?.["activity-alias"] || [];

    for (const alias of aliases) {
      const name = alias.$?.["android:name"] || "";
      for (const [key, iconProp] of Object.entries(props || {})) {
        if (name.endsWith(`MainActivity${key}`)) {
          if (iconProp?.label) {
            alias.$["android:label"] = iconProp.label;
          }
        }
      }
    }
    return modConfig;
  });

  // Generate the icon resources and launcher aliases.
  config = withDynamicIcon(config, props);

  return config;
};
