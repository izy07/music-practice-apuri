/**
 * カスタムエントリポイント
 *
 * Play 実機テストでは DevTools が使えないため、
 * JS 起動前/起動直後のクラッシュ内容を Alert で見えるようにする。
 */
require('react-native-gesture-handler');

const { Platform, Alert } = require('react-native');

if (Platform.OS !== 'web') {
  setTimeout(() => {
    try {
      require('expo-splash-screen').hideAsync();
    } catch {
      // スプラッシュ未リンク時は無視
    }
  }, 300);
}

function showBootAlert(title, message) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-console
    console.error(`[${title}]`, message);
    return;
  }
  try {
    Alert.alert(title, message);
  } catch {
    // Alert 未準備時は握りつぶす
  }
}

if (Platform.OS !== 'web') {
  const errorUtils = global.ErrorUtils;
  if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      const message =
        (error && (error.message || String(error))) || '不明なエラー';
      const stack =
        error && error.stack ? `\n\n${String(error.stack).slice(0, 900)}` : '';
      showBootAlert(
        isFatal ? '致命的なアプリエラー' : 'アプリエラー',
        `${message}${stack}`,
      );
      if (typeof defaultHandler === 'function') {
        defaultHandler(error, isFatal);
      }
    });
  }
}

try {
  require('expo-router/entry');
} catch (bootError) {
  const message =
    bootError instanceof Error ? bootError.message : String(bootError);
  const stack =
    bootError instanceof Error && bootError.stack
      ? `\n\n${bootError.stack.slice(0, 900)}`
      : '';
  showBootAlert('起動に失敗しました', `${message}${stack}`);
  throw bootError;
}
