/**
 * validation.ts のテスト
 * バリデーション関数の正確性を保証
 */

import {
  isString,
  isNullableString,
  isOrganization,
  isOrganizationArray,
  isSchedule,
  isScheduleArray,
  isTask,
  isTaskArray,
  assert,
  isNumber,
  isBoolean,
  isArray,
} from '@/lib/validation';

describe('isString', () => {
  it('文字列をtrueで返す', () => {
    expect(isString('test')).toBe(true);
    expect(isString('')).toBe(true);
  });

  it('文字列以外をfalseで返す', () => {
    expect(isString(123)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString([])).toBe(false);
  });
});

describe('isNullableString', () => {
  it('文字列、null、undefinedをtrueで返す', () => {
    expect(isNullableString('test')).toBe(true);
    expect(isNullableString(null)).toBe(true);
    expect(isNullableString(undefined)).toBe(true);
  });

  it('その他の型をfalseで返す', () => {
    expect(isNullableString(123)).toBe(false);
    expect(isNullableString({})).toBe(false);
  });
});

describe('isOrganization', () => {
  it('有効な組織オブジェクトをtrueで返す', () => {
    expect(isOrganization({ id: 'org-1', name: 'Test Org' })).toBe(true);
  });

  it('無効な組織オブジェクトをfalseで返す', () => {
    expect(isOrganization({ id: 'org-1' })).toBe(false);
    expect(isOrganization({ name: 'Test Org' })).toBe(false);
    expect(isOrganization({})).toBe(false);
    expect(isOrganization(null)).toBe(false);
    expect(isOrganization('string')).toBe(false);
  });
});

describe('isOrganizationArray', () => {
  it('有効な組織配列をtrueで返す', () => {
    expect(isOrganizationArray([
      { id: 'org-1', name: 'Org 1' },
      { id: 'org-2', name: 'Org 2' },
    ])).toBe(true);
  });

  it('無効な組織配列をfalseで返す', () => {
    expect(isOrganizationArray([
      { id: 'org-1', name: 'Org 1' },
      { id: 'org-2' }, // nameが欠けている
    ])).toBe(false);
    expect(isOrganizationArray([])).toBe(true); // 空配列は有効
    expect(isOrganizationArray('not array')).toBe(false);
  });
});

describe('isSchedule', () => {
  it('有効なスケジュールオブジェクトをtrueで返す', () => {
    expect(isSchedule({
      id: 'schedule-1',
      organization_id: 'org-1',
      title: 'Test Schedule',
      practice_date: '2025-01-15',
    })).toBe(true);
  });

  it('無効なスケジュールオブジェクトをfalseで返す', () => {
    expect(isSchedule({ id: 'schedule-1' })).toBe(false);
    expect(isSchedule(null)).toBe(false);
  });
});

describe('isScheduleArray', () => {
  it('有効なスケジュール配列をtrueで返す', () => {
    expect(isScheduleArray([
      { id: 'schedule-1', organization_id: 'org-1', title: 'Schedule 1', practice_date: '2025-01-15' },
    ])).toBe(true);
  });

  it('無効なスケジュール配列をfalseで返す', () => {
    expect(isScheduleArray([{ id: 'schedule-1' }])).toBe(false);
  });
});

describe('isTask', () => {
  it('有効なタスクオブジェクトをtrueで返す', () => {
    expect(isTask({ id: 'task-1', title: 'Test Task', status: 'pending' })).toBe(true);
  });

  it('無効なタスクオブジェクトをfalseで返す', () => {
    expect(isTask({ id: 'task-1' })).toBe(false);
    expect(isTask(null)).toBe(false);
  });
});

describe('isTaskArray', () => {
  it('有効なタスク配列をtrueで返す', () => {
    expect(isTaskArray([
      { id: 'task-1', title: 'Task 1', status: 'pending' },
    ])).toBe(true);
  });

  it('無効なタスク配列をfalseで返す', () => {
    expect(isTaskArray([{ id: 'task-1' }])).toBe(false);
  });
});

describe('assert', () => {
  it('条件がtrueの場合はエラーをスローしない', () => {
    expect(() => assert(true, 'Error message')).not.toThrow();
  });

  it('条件がfalseの場合はエラーをスローする', () => {
    expect(() => assert(false, 'Error message')).toThrow('Error message');
  });
});

describe('isNumber', () => {
  it('有効な数値をtrueで返す', () => {
    expect(isNumber(123)).toBe(true);
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-123)).toBe(true);
    expect(isNumber(123.45)).toBe(true);
  });

  it('NaNをfalseで返す', () => {
    expect(isNumber(NaN)).toBe(false);
  });

  it('数値以外をfalseで返す', () => {
    expect(isNumber('123')).toBe(false);
    expect(isNumber(null)).toBe(false);
    expect(isNumber(undefined)).toBe(false);
  });
});

describe('isBoolean', () => {
  it('真偽値をtrueで返す', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
  });

  it('真偽値以外をfalseで返す', () => {
    expect(isBoolean(0)).toBe(false);
    expect(isBoolean(1)).toBe(false);
    expect(isBoolean('true')).toBe(false);
    expect(isBoolean(null)).toBe(false);
  });
});

describe('isArray', () => {
  it('配列をtrueで返す', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
  });

  it('配列以外をfalseで返す', () => {
    expect(isArray({})).toBe(false);
    expect(isArray('string')).toBe(false);
    expect(isArray(null)).toBe(false);
  });
});




