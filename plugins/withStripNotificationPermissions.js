/**
 * expo-notifications が自動追加する不要な権限を除去するプラグイン
 * 
 * expo-notifications は以下の権限を自動で追加するが、
 * 本アプリでは実装していないため除去する：
 * - VIBRATE (バイブレーション制御)
 * - RECEIVE_BOOT_COMPLETED (起動時実行)
 * - WAKE_LOCK (スリープ防止) ※録音で既に必要なので残す
 */
const {
  AndroidConfig,
  createRunOncePlugin,
} = require('expo/config-plugins');

const NOTIFICATION_PERMISSIONS_TO_REMOVE = [
  'android.permission.VIBRATE', // バイブレーション制御コードが未実装
  'android.permission.RECEIVE_BOOT_COMPLETED', // 起動時の通知復元が未実装
];

function withStripNotificationPermissions(config) {
  // expo-notifications が追加する不要な権限を tools:node="remove" で除外
  return AndroidConfig.Permissions.withBlockedPermissions(
    config,
    NOTIFICATION_PERMISSIONS_TO_REMOVE
  );
}

module.exports = createRunOncePlugin(
  withStripNotificationPermissions,
  'withStripNotificationPermissions',
  '1.0.0'
);
