// Dynamic Expo config.
//
// This wraps the static configuration in app.json so we can inject the
// google-services.json path from an EAS "file" environment variable at build
// time. google-services.json is git-ignored (it holds Firebase secrets), so
// EAS Build cannot receive it as a tracked file — it must come from an env var.
//
// Set it up once with:
//   eas env:create --name GOOGLE_SERVICES_JSON --type file \
//     --value ./google-services.json --environment preview
//   eas env:create --name GOOGLE_SERVICES_JSON --type file \
//     --value ./google-services.json --environment production
//
// At build time GOOGLE_SERVICES_JSON holds the path to the restored file.
// Locally it is undefined, so we fall back to the committed relative path.

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
});
