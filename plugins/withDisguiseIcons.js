const pluginModule = require('@howincodes/expo-dynamic-app-icon/app.plugin');
const withDynamicIcon = pluginModule.default || pluginModule;
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withDisguiseIcons(config, props) {
  // 1. Delegate base generation (mipmap folders, adaptive icon XMLs, etc.) to withDynamicIcon
  config = withDynamicIcon(config, props);

  // 2. Enhance AndroidManifest activity-alias to use custom disguise labels (e.g. "Calculator", "Notes")
  config = withAndroidManifest(config, (modConfig) => {
    const mainApp = modConfig.modResults?.manifest?.application?.[0];
    const aliases = mainApp?.['activity-alias'] || [];

    for (const alias of aliases) {
      const name = alias.$?.['android:name'] || '';
      for (const [key, iconProp] of Object.entries(props || {})) {
        if (name.endsWith(`MainActivity${key}`)) {
          if (iconProp?.label) {
            alias.$['android:label'] = iconProp.label;
          }
        }
      }
    }
    return modConfig;
  });

  return config;
};
