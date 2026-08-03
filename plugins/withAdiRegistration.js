const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Copies assets/adi-registration.properties into the native Android
 * assets folder (android/app/src/main/assets) so Google Play can read it
 * from the packaged APK to verify app ownership.
 *
 * This is required because in a managed Expo workflow the root `assets/`
 * folder is a JS/bundler folder and is NOT copied into the APK's native
 * assets directory.
 */
const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const src = path.join(
        config.modRequest.projectRoot,
        'assets',
        'adi-registration.properties'
      );
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      );
      const dest = path.join(destDir, 'adi-registration.properties');

      if (!fs.existsSync(src)) {
        throw new Error(
          `[withAdiRegistration] Missing file: ${src}. ` +
            'Create assets/adi-registration.properties with the snippet from Play Console.'
        );
      }

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);

      return config;
    },
  ]);
};

module.exports = withAdiRegistration;
