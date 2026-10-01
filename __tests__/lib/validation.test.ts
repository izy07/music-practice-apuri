/**
 * validation.ts のテスト
 */

import {
  isString,
  isNullableString,
  assert,
  isNumber,
  isBoolean,
  isArray,
  isNonEmptyString,
} from '@/lib/validation';

describe('isString', () => {
  it('文字列をtrueで返す', () => {
    expect(isString('test')).toBe(true);
    expect(isString('')).toBe(true);
  });

  it('文字列以外をfalseで返す', () => {
    expect(isString(123)).toBe(false);
    expect(isString(null)).toBe(false);
  });
});

describe('isNullableString', () => {
  it('文字列、null、undefinedをtrueで返す', () => {
    expect(isNullableString('test')).toBe(true);
    expect(isNullableString(null)).toBe(true);
    expect(isNullableString(undefined)).toBe(true);
  });
});

describe('isNonEmptyString', () => {
  it('空でない文字列のみ true', () => {
    expect(isNonEmptyString('a')).toBe(true);
    expect(isNonEmptyString('  ')).toBe(false);
  });
});

describe('assert', () => {
  it('条件がfalseの場合はエラーをスローする', () => {
    expect(() => assert(false, 'Error message')).toThrow('Error message');
  });
});

describe('isNumber', () => {
  it('有効な数値をtrueで返す', () => {
    expect(isNumber(123)).toBe(true);
    expect(isNumber(NaN)).toBe(false);
  });
});

describe('isBoolean', () => {
  it('真偽値をtrueで返す', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean('true')).toBe(false);
  });
});

describe('isArray', () => {
  it('配列をtrueで返す', () => {
    expect(isArray([])).toBe(true);
    expect(isArray({})).toBe(false);
  });
});
