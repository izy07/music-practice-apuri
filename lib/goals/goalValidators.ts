/**
 * 目標関連のバリデーションロジックを統一管理
 * 機能を変えずに、重複コードを削減
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 目標タイトルのバリデーション
 */
export function validateGoalTitle(title: string): ValidationResult {
  if (!title.trim()) {
    return { valid: false, error: '目標タイトルを入力してください' };
  }
  if (title.trim().length > 200) {
    return { valid: false, error: 'タイトルは200文字以内で入力してください' };
  }
  return { valid: true };
}

/**
 * 目標タイプのバリデーション
 */
export function validateGoalType(goalType: string | null | undefined): ValidationResult {
  if (!goalType) {
    return { valid: false, error: '目標タイプを選択してください' };
  }
  if (goalType !== 'personal_short' && goalType !== 'personal_long') {
    return { valid: false, error: '無効な目標タイプです' };
  }
  return { valid: true };
}

/**
 * 目標データ全体のバリデーション
 */
export function validateGoalData(goalData: {
  title: string;
  goal_type?: 'personal_short' | 'personal_long' | null;
}): ValidationResult {
  const titleValidation = validateGoalTitle(goalData.title);
  if (!titleValidation.valid) {
    return titleValidation;
  }

  if (goalData.goal_type !== undefined) {
    const typeValidation = validateGoalType(goalData.goal_type);
    if (!typeValidation.valid) {
      return typeValidation;
    }
  }

  return { valid: true };
}
