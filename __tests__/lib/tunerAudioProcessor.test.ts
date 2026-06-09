/**
 * tunerAudioProcessor.ts のテスト
 * 周波数→音名・セント計算の正確性を保証（特にA4=442Hzで0セントになること）
 */

import { getNoteFromFrequency } from '@/lib/tunerAudioProcessor';

describe('tunerAudioProcessor', () => {
  describe('getNoteFromFrequency', () => {
    it('A4=442Hz、基準442Hzのときセントは0', () => {
      const result = getNoteFromFrequency(442, 442);
      expect(result.note).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeCloseTo(0, 0);
    });

    it('A4=442Hz、基準440Hzのときセントは約+8（高い）', () => {
      const result = getNoteFromFrequency(442, 440);
      expect(result.note).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeGreaterThan(7);
      expect(result.cents).toBeLessThan(10);
    });

    it('第2引省略時はデフォルト442HzでA4=442が0セント', () => {
      const result = getNoteFromFrequency(442);
      expect(result.cents).toBeCloseTo(0, 0);
    });

    it('A4=440Hz、基準442Hzのときセントは約-8（低い）', () => {
      const result = getNoteFromFrequency(440, 442);
      expect(result.note).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBeLessThan(-7);
      expect(result.cents).toBeGreaterThan(-10);
    });
  });
});
