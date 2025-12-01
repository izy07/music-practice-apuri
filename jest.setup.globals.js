// Jest グローバルオブジェクト初期化ファイル
// jest-expoのセットアップより前に実行される（setupFilesで使用）
// jest-expoがObject.definePropertyを呼び出す前に、対象オブジェクトを確実に初期化

// Object.definePropertyをパッチして、非オブジェクトに対する呼び出しを防止
// jest-expoのセットアップスクリプトがnull/undefinedに対してObject.definePropertyを呼び出すのを防ぐ
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
  // objがnullまたはundefinedの場合は、空のオブジェクトを作成して警告を出力
  if (obj === null || obj === undefined) {
    if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_JEST) {
      console.warn(`[jest.setup.globals] Object.defineProperty called on ${obj}, creating empty object for property: ${String(prop)}`);
    }
    // 新しいオブジェクトを作成して、それに対してdefinePropertyを実行
    const newObj = {};
    try {
      return originalDefineProperty.call(this, newObj, prop, descriptor);
    } catch (e) {
      // エラーが発生した場合は、元の関数を呼び出さずに警告のみ
      if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_JEST) {
        console.warn(`[jest.setup.globals] Failed to define property on empty object:`, e.message);
      }
      return newObj;
    }
  }
  // objがオブジェクトでない場合は、空のオブジェクトを作成
  if (typeof obj !== 'object' && typeof obj !== 'function') {
    if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_JEST) {
      console.warn(`[jest.setup.globals] Object.defineProperty called on non-object (${typeof obj}), creating empty object for property: ${String(prop)}`);
    }
    const newObj = {};
    try {
      return originalDefineProperty.call(this, newObj, prop, descriptor);
    } catch (e) {
      if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_JEST) {
        console.warn(`[jest.setup.globals] Failed to define property on empty object:`, e.message);
      }
      return newObj;
    }
  }
  // 正常な場合は元の関数を呼び出す
  return originalDefineProperty.call(this, obj, prop, descriptor);
};

// globalオブジェクトが存在することを確認
if (typeof global !== 'undefined') {
  // consoleオブジェクトの初期化
  if (!global.console || typeof global.console !== 'object') {
    global.console = {};
  }
  
  // processオブジェクトの初期化
  if (!global.process || typeof global.process !== 'object') {
    global.process = {};
  }
  
  // process.envの初期化
  if (!global.process.env || typeof global.process.env !== 'object') {
    global.process.env = {};
  }
  
  // その他の必要なグローバルオブジェクトの初期化
  if (!global.window) {
    global.window = {};
  }
  
  if (!global.document) {
    global.document = {};
  }
  
  if (!global.navigator) {
    global.navigator = {};
  }
  
  // globalThisの初期化（Node.js環境で必要）
  if (typeof globalThis === 'undefined') {
    global.globalThis = global;
  }
  
  // その他のReact Native/Expoで必要なグローバルオブジェクト
  if (!global.__DEV__) {
    global.__DEV__ = true;
  }
  
  if (!global.__METRO__) {
    global.__METRO__ = {};
  }
}

