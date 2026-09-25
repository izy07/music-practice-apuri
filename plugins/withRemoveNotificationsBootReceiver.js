/**
 * Android 15+: BOOT_COMPLETED から制限付き FGS を起動するレシーバーはクラッシュ原因になる。
 * expo-notifications の BOOT 系 intent-filter のみ除去（通知イベント自体は残す）。
 * 端末再起動後の再スケジュールはアプリ起動時に行う。
 */
const { AndroidConfig, createRunOncePlugin, withAndroidManifest } = require('expo/config-plugins');

const BOOT_ACTIONS = new Set([
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.REBOOT',
  'android.intent.action.QUICKBOOT_POWERON',
  'com.htc.intent.action.QUICKBOOT_POWERON',
]);

function withRemoveNotificationsBootReceiver(config) {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
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
          return !BOOT_ACTIONS.has(actionName);
        });
      }
    }

    return config;
  });
}

module.exports = createRunOncePlugin(
  withRemoveNotificationsBootReceiver,
  'withRemoveNotificationsBootReceiver',
  '1.0.0'
);
