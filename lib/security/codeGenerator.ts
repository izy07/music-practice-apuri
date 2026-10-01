/**
 * ランダムコード生成（必要最小限のみ）
 */

const CODE_CONFIG = {
  passwordLength: 8,
  passwordChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
} as const;

export class CodeGenerationError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'CodeGenerationError';
  }
}

/**
 * 大文字英数字パスワードを生成（将来のワンタイムコード等用）
 */
export function generatePassword(length: number = CODE_CONFIG.passwordLength): string {
  if (length < 1) {
    throw new CodeGenerationError('パスワードの長さは1以上である必要があります');
  }

  try {
    const chars = CODE_CONFIG.passwordChars;
    let result = '';
    const randomValues = crypto.getRandomValues(new Uint32Array(length));
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomValues[i] % chars.length);
    }
    return result;
  } catch {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CODE_CONFIG.passwordChars.charAt(
        Math.floor(Math.random() * CODE_CONFIG.passwordChars.length)
      );
    }
    return result;
  }
}
