/**
 * Android 15+: BOOT_COMPLETED から制限付き FGS を起動するレシーバーはクラッシュ原因になる。
 * expo-notifications の BOOT 系 intent-filter のみ除去（通知イベント自体は残す）。
 * 端末再起動後の再スケジュールはアプリ起動時に行う。
 *
 * RECEIVE_BOOT_COMPLETED 権限の除去は app.config android.blockedPermissions で行う（v12 成功構成）。
 */
const { AndroidConfig, createRunOncePlugin, withAndroidManifest } = require('expo/config-plugins');

const SETUP_BROADCAST_ACTIONS = new Set([
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.REBOOT',
  'android.intent.action.QUICKBOOT_POWERON',
  'com.htc.intent.action.QUICKBOOT_POWERON',
  'android.intent.action.MY_PACKAGE_REPLACED',
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
          return !SETUP_BROADCAST_ACTIONS.has(actionName);
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
