/**
 * コード生成モジュール
 * 
 * 招待コードや認証コードなどのランダムコードを生成します。
 * 
 * @module lib/security/codeGenerator
 */

/**
 * コード生成の設定
 */
const CODE_CONFIG = {
  /** 招待コードの長さ */
  inviteCodeLength: 6,
  /** 招待コードに使用する文字セット */
  inviteCodeChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  /** パスワードの長さ（デフォルト） */
  passwordLength: 8,
  /** パスワードに使用する文字セット（大文字英数字） */
  passwordChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
} as const;

/**
 * コード生成エラー
 */
export class CodeGenerationError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'CodeGenerationError';
  }
}

/**
 * 招待コードを生成します
 * 
 * 6桁の英数字コードをランダムに生成します。
 * 
 * @returns 生成された招待コード（大文字）
 * 
 * @example
 * ```typescript
 * const code = generateInviteCode();
 * // 結果: "ABC123"
 * ```
 */
export function generateInviteCode(): string {
  try {
    const chars = CODE_CONFIG.inviteCodeChars;
    let result = '';
    
    // 暗号学的に安全な乱数生成器を使用
    const randomValues = crypto.getRandomValues(
      new Uint32Array(CODE_CONFIG.inviteCodeLength)
    );
    
    for (let i = 0; i < CODE_CONFIG.inviteCodeLength; i++) {
      const randomIndex = randomValues[i] % chars.length;
      result += chars.charAt(randomIndex);
    }
    
    return result;
  } catch (error) {
    // フォールバック: Math.random()を使用（セキュリティは低いが動作は保証）
    let result = '';
    for (let i = 0; i < CODE_CONFIG.inviteCodeLength; i++) {
      result += CODE_CONFIG.inviteCodeChars.charAt(
        Math.floor(Math.random() * CODE_CONFIG.inviteCodeChars.length)
      );
    }
    return result;
  }
}

/**
 * パスワードを生成します
 * 
 * 指定された長さの大文字英数字パスワードをランダムに生成します。
 * 
 * @param length - パスワードの長さ（デフォルト: 8）
 * @returns 生成されたパスワード（大文字英数字）
 * 
 * @example
 * ```typescript
 * const password = generatePassword(8);
 * // 結果: "A1B2C3D4"
 * ```
 */
export function generatePassword(length: number = CODE_CONFIG.passwordLength): string {
  if (length < 1) {
    throw new CodeGenerationError('パスワードの長さは1以上である必要があります');
  }
  
  try {
    const chars = CODE_CONFIG.passwordChars;
    let result = '';
    
    // 暗号学的に安全な乱数生成器を使用
    const randomValues = crypto.getRandomValues(new Uint32Array(length));
    
    for (let i = 0; i < length; i++) {
      const randomIndex = randomValues[i] % chars.length;
      result += chars.charAt(randomIndex);
    }
    
    return result;
  } catch (error) {
    // フォールバック: Math.random()を使用
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CODE_CONFIG.passwordChars.charAt(
        Math.floor(Math.random() * CODE_CONFIG.passwordChars.length)
      );
    }
    return result;
  }
}

/**
 * 管理者コードを生成します
 * 
 * 4桁の数字コードをランダムに生成します。
 * 
 * @returns 生成された管理者コード（4桁の数字）
 * 
 * @example
 * ```typescript
 * const code = generateAdminCode();
 * // 結果: "1234"
 * ```
 */
export function generateAdminCode(): string {
  try {
    // 4桁の数字コードを生成
    const randomValues = crypto.getRandomValues(new Uint32Array(4));
    let result = '';
    
    for (let i = 0; i < 4; i++) {
      // 0-9の数字を生成
      result += (randomValues[i] % 10).toString();
    }
    
    return result;
  } catch (error) {
    // フォールバック: Math.random()を使用
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
  }
}

/**
 * コードの形式を検証します
 * 
 * @param code - 検証するコード
 * @param type - コードのタイプ
 * @returns コードが有効な形式の場合true
 */
export function validateCodeFormat(
  code: string,
  type: 'invite' | 'password' | 'admin'
): boolean {
  switch (type) {
    case 'invite':
      return /^[A-Z0-9]{6}$/.test(code);
    case 'password':
      return /^[A-Z0-9]{8}$/.test(code);
    case 'admin':
      return /^\d{4}$/.test(code);
    default:
      return false;
  }
}

