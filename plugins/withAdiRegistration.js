const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Places adi-registration.properties into native Android assets for
 * Google Play "Android developer verification" package ownership proof.
 */
function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const sourcePath = path.join(projectRoot, 'assets', 'adi-registration.properties');
      if (!fs.existsSync(sourcePath)) {
        throw new Error(
          'Missing assets/adi-registration.properties (Play Console ownership snippet).'
        );
      }
      const snippet = fs.readFileSync(sourcePath);
      const assetsDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, 'adi-registration.properties'), snippet);
      return cfg;
    },
  ]);
}

module.exports = withAdiRegistration;
