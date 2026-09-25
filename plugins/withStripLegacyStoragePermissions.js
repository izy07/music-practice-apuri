/**
 * expo-file-system 等がレガシー宣言する外部ストレージ権限を、
 * 最終 AndroidManifest から除去する（tools:node="remove"）。
 *
 * 本アプリの録音・ファイルはアプリ専用領域のみを使うため、
 * READ/WRITE_EXTERNAL_STORAGE および READ_MEDIA_* は不要。
 * 未使用の expo-image-picker は依存から削除済み。残るのは file-system の誤宣言。
 */
const {
  AndroidConfig,
  createRunOncePlugin,
} = require('expo/config-plugins');

const PERMISSIONS_TO_REMOVE = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
];

function withStripLegacyStoragePermissions(config) {
  // withBlockedPermissions = 依存ライブラリ後からも tools:node="remove" で確実に除外
  return AndroidConfig.Permissions.withBlockedPermissions(config, PERMISSIONS_TO_REMOVE);
}

module.exports = createRunOncePlugin(
  withStripLegacyStoragePermissions,
  'withStripLegacyStoragePermissions',
  '1.0.0'
);
