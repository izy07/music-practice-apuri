/**
 * パスワードハッシュ化モジュール
 * 
 * PBKDF2を使用した安全なパスワードハッシュ化と検証を提供します。
 * 
 * @module lib/security/passwordHasher
 */

/**
 * パスワードハッシュ化の設定
 */
const HASH_CONFIG = {
  /** PBKDF2の反復回数 */
  iterations: 100000,
  /** ハッシュアルゴリズム */
  hash: 'SHA-256' as const,
  /** ソルトの長さ（バイト） */
  saltLength: 16,
  /** ハッシュの長さ（ビット） */
  hashLength: 256,
} as const;

/**
 * パスワードハッシュ化の結果
 */
export interface HashResult {
  /** ハッシュ化されたパスワード（Base64エンコード） */
  hash: string;
  /** 使用されたソルト（デバッグ用、本番では返さない） */
  salt?: Uint8Array;
}

/**
 * パスワードハッシュ化エラー
 */
export class PasswordHashError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'PasswordHashError';
  }
}

/**
 * パスワードをハッシュ化します
 * 
 * PBKDF2を使用してパスワードをハッシュ化し、ソルトとハッシュを結合して
 * Base64エンコードした文字列を返します。
 * 
 * @param password - ハッシュ化するパスワード
 * @returns ハッシュ化されたパスワード（Base64エンコード）
 * @throws {PasswordHashError} ハッシュ化に失敗した場合
 * 
 * @example
 * ```typescript
 * const hash = await hashPassword('myPassword123');
 * // 結果: "base64エンコードされたハッシュ"
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // ランダムなソルトを生成
    const salt = crypto.getRandomValues(new Uint8Array(HASH_CONFIG.saltLength));
    
    // パスワードをバイト配列に変換
    const passwordBuffer = new TextEncoder().encode(password);
    
    // キーマテリアルをインポート
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    // PBKDF2でハッシュ化
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: HASH_CONFIG.iterations,
        hash: HASH_CONFIG.hash,
      },
      keyMaterial,
      HASH_CONFIG.hashLength
    );
    
    // ソルトとハッシュを結合
    const hashArray = new Uint8Array(derivedBits);
    const result = new Uint8Array(salt.length + hashArray.length);
    result.set(salt);
    result.set(hashArray, salt.length);
    
    // Base64エンコードして返す
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    // フォールバック: SHA-256 + ソルト（互換性のため）
    try {
      return await hashPasswordFallback(password);
    } catch (fallbackError) {
      throw new PasswordHashError(
        'パスワードのハッシュ化に失敗しました',
        fallbackError
      );
    }
  }
}

/**
 * パスワードを検証します
 * 
 * 入力されたパスワードとハッシュ化されたパスワードを比較します。
 * 
 * @param password - 検証するパスワード
 * @param hashedPassword - ハッシュ化されたパスワード（Base64エンコード）
 * @returns パスワードが一致する場合true、そうでない場合false
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('myPassword123', storedHash);
 * if (isValid) {
 *   // パスワードが正しい
 * }
 * ```
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Base64デコード
    const decoded = atob(hashedPassword);
    const result = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      result[i] = decoded.charCodeAt(i);
    }
    
    // ソルトとハッシュを分離
    const salt = result.slice(0, HASH_CONFIG.saltLength);
    const storedHash = result.slice(HASH_CONFIG.saltLength);
    
    // 入力パスワードをハッシュ化
    const passwordBuffer = new TextEncoder().encode(password);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: HASH_CONFIG.iterations,
        hash: HASH_CONFIG.hash,
      },
      keyMaterial,
      HASH_CONFIG.hashLength
    );
    
    const derivedHash = new Uint8Array(derivedBits);
    
    // ハッシュを比較（タイミング攻撃対策のため定数時間比較）
    return constantTimeCompare(derivedHash, storedHash);
  } catch (error) {
    // フォールバック: 古い形式の検証（互換性のため）
    if (hashedPassword.includes(':')) {
      return await verifyPasswordFallback(password, hashedPassword);
    }
    return false;
  }
}

/**
 * 定数時間での配列比較（タイミング攻撃対策）
 */
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * フォールバック: SHA-256 + ソルト（古い形式との互換性のため）
 */
async function hashPasswordFallback(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(HASH_CONFIG.saltLength));
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(
    Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  );
  
  const combinedData = new Uint8Array(passwordData.length + saltData.length);
  combinedData.set(passwordData);
  combinedData.set(saltData, passwordData.length);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', combinedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')}:${hashString}`;
}

/**
 * フォールバック: 古い形式のパスワード検証
 */
async function verifyPasswordFallback(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const [saltHex, hashHex] = hashedPassword.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }
  
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(saltHex);
  
  const combinedData = new Uint8Array(passwordData.length + saltData.length);
  combinedData.set(passwordData);
  combinedData.set(saltData, passwordData.length);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', combinedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashString === hashHex;
}

