/**
 * Android 15+: BOOT_COMPLETED から制限付き FGS を起動するレシーバーはクラッシュ原因になる。
 * expo-notifications の BOOT 系 intent-filter のみ除去（通知イベント自体は残す）。
 * 端末再起動後の再スケジュールはアプリ起動時に行う。
 */
const { AndroidConfig, createRunOncePlugin, withAndroidManifest } = require('expo/config-plugins');

/** expo-notifications NotificationsService の SETUP_ACTIONS（Android 15+ で FGS 絡みのクラッシュ要因） */
const SETUP_BROADCAST_ACTIONS = new Set([
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.REBOOT',
  'android.intent.action.QUICKBOOT_POWERON',
  'com.htc.intent.action.QUICKBOOT_POWERON',
  'android.intent.action.MY_PACKAGE_REPLACED',
]);

function withRemoveNotificationsBootReceiver(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Play Console「BOOT_COMPLETED + 制限付き FGS」警告の permission も除去
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    const permissions = manifest['uses-permission'];
    const bootPerm = {
      $: {
        'android:name': 'android.permission.RECEIVE_BOOT_COMPLETED',
        'tools:node': 'remove',
      },
    };
    const hasBootPermRemove = permissions.some(
      (p) =>
        p.$?.['android:name'] === 'android.permission.RECEIVE_BOOT_COMPLETED' &&
        p.$?.['tools:node'] === 'remove'
    );
    if (!hasBootPermRemove) {
      permissions.push(bootPerm);
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const receivers = app.receiver ?? [];

    for (const receiver of receivers) {
      const name = receiver.$?.['android:name'] ?? '';
      if (!name.includes('notifications.service.NotificationsService')) {
        continue;
      }

      const filters = receiver['intent-filter'] ?? [];
      for (const filter of filters) {
        const actions = filter.action ?? [];
        filter.action = actions.filter((action) => {
          const actionName = action.$?.['android:name'];
          return !SETUP_BROADCAST_ACTIONS.has(actionName);
        });
      }
    }

    config.modResults = manifest;
    return config;
  });
}

module.exports = createRunOncePlugin(
  withRemoveNotificationsBootReceiver,
  'withRemoveNotificationsBootReceiver',
  '1.0.0'
);
