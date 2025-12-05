/**
 * 組織管理関連のバリデーション関数
 * 
 * 組織、サブグループ、管理者コードなどのバリデーションロジックを提供します。
 * 
 * @module lib/validation/organizationValidators
 */

import type {
  CreateOrganizationInput,
  JoinOrganizationInput,
  SetAdminCodeInput,
  UpdateOrganizationInput,
} from '@/types/organization';
import type { ValidationResult } from '@/services/baseService';
import { validateCodeFormat } from '@/lib/security/codeGenerator';

/**
 * 組織名の最小・最大長
 */
const ORGANIZATION_NAME_LIMITS = {
  min: 1,
  max: 100,
} as const;

/**
 * 説明文の最大長
 */
const DESCRIPTION_MAX_LENGTH = 1000;

/**
 * 組織作成時の入力データをバリデーション
 * 
 * @param input - バリデーションする入力データ
 * @returns バリデーション結果
 */
export function validateCreateOrganization(
  input: CreateOrganizationInput
): ValidationResult {
  const errors: string[] = [];

  // 組織名のバリデーション
  if (!input.name || typeof input.name !== 'string') {
    errors.push('組織名は必須です');
  } else {
    const trimmedName = input.name.trim();
    if (trimmedName.length < ORGANIZATION_NAME_LIMITS.min) {
      errors.push(`組織名は${ORGANIZATION_NAME_LIMITS.min}文字以上である必要があります`);
    }
    if (trimmedName.length > ORGANIZATION_NAME_LIMITS.max) {
      errors.push(`組織名は${ORGANIZATION_NAME_LIMITS.max}文字以下である必要があります`);
    }
  }

  // 説明のバリデーション
  if (input.description !== undefined) {
    if (typeof input.description !== 'string') {
      errors.push('説明は文字列である必要があります');
    } else if (input.description.length > DESCRIPTION_MAX_LENGTH) {
      errors.push(`説明は${DESCRIPTION_MAX_LENGTH}文字以下である必要があります`);
    }
  }

  // カスタムパスワードのバリデーション
  if (input.customPassword !== undefined && !input.isSolo) {
    if (typeof input.customPassword !== 'string') {
      errors.push('カスタムパスワードは文字列である必要があります');
    } else if (!validateCodeFormat(input.customPassword, 'password')) {
      errors.push('カスタムパスワードは8桁の大文字英数字である必要があります');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 組織更新時の入力データをバリデーション
 * 
 * @param input - バリデーションする入力データ
 * @returns バリデーション結果
 */
export function validateUpdateOrganization(
  input: UpdateOrganizationInput
): ValidationResult {
  const errors: string[] = [];

  // 組織名のバリデーション
  if (input.name !== undefined) {
    if (typeof input.name !== 'string') {
      errors.push('組織名は文字列である必要があります');
    } else {
      const trimmedName = input.name.trim();
      if (trimmedName.length < ORGANIZATION_NAME_LIMITS.min) {
        errors.push(`組織名は${ORGANIZATION_NAME_LIMITS.min}文字以上である必要があります`);
      }
      if (trimmedName.length > ORGANIZATION_NAME_LIMITS.max) {
        errors.push(`組織名は${ORGANIZATION_NAME_LIMITS.max}文字以下である必要があります`);
      }
    }
  }

  // 説明のバリデーション
  if (input.description !== undefined) {
    if (typeof input.description !== 'string') {
      errors.push('説明は文字列である必要があります');
    } else if (input.description.length > DESCRIPTION_MAX_LENGTH) {
      errors.push(`説明は${DESCRIPTION_MAX_LENGTH}文字以下である必要があります`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 組織参加時の入力データをバリデーション
 * 
 * @param input - バリデーションする入力データ
 * @returns バリデーション結果
 */
export function validateJoinOrganization(
  input: JoinOrganizationInput
): ValidationResult {
  const errors: string[] = [];

  // 組織IDのバリデーション
  if (!input.organizationId || typeof input.organizationId !== 'string') {
    errors.push('組織IDは必須です');
  } else if (input.organizationId.trim().length === 0) {
    errors.push('組織IDが無効です');
  }

  // パスワードのバリデーション
  if (!input.password || typeof input.password !== 'string') {
    errors.push('パスワードは必須です');
  } else if (!validateCodeFormat(input.password, 'password')) {
    errors.push('パスワードは8桁の大文字英数字である必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 管理者コード設定時の入力データをバリデーション
 * 
 * @param input - バリデーションする入力データ
 * @returns バリデーション結果
 */
export function validateSetAdminCode(
  input: SetAdminCodeInput
): ValidationResult {
  const errors: string[] = [];

  // 組織IDのバリデーション
  if (!input.organizationId || typeof input.organizationId !== 'string') {
    errors.push('組織IDは必須です');
  } else if (input.organizationId.trim().length === 0) {
    errors.push('組織IDが無効です');
  }

  // 管理者コードのバリデーション
  if (!input.adminCode || typeof input.adminCode !== 'string') {
    errors.push('管理者コードは必須です');
  } else if (!validateCodeFormat(input.adminCode, 'admin')) {
    errors.push('管理者コードは4桁の数字である必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 管理者コードの形式をバリデーション
 * 
 * @param code - バリデーションするコード
 * @returns コードが有効な形式の場合true
 */
export function validateAdminCodeFormat(code: string): boolean {
  return validateCodeFormat(code, 'admin');
}

/**
 * パスワードの形式をバリデーション
 * 
 * @param password - バリデーションするパスワード
 * @returns パスワードが有効な形式の場合true
 */
export function validatePasswordFormat(password: string): boolean {
  return validateCodeFormat(password, 'password');
}

/**
 * 招待コードの形式をバリデーション
 * 
 * @param code - バリデーションするコード
 * @returns コードが有効な形式の場合true
 */
export function validateInviteCodeFormat(code: string): boolean {
  return validateCodeFormat(code, 'invite');
}

/**
 * 組織名を正規化（前後の空白を削除）
 * 
 * @param name - 正規化する組織名
 * @returns 正規化された組織名
 */
export function normalizeOrganizationName(name: string): string {
  return name.trim();
}


